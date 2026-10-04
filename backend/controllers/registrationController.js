/**
 * REGISTRATION CONTROLLER
 * -----------------------
 * This is the most MongoDB-intensive controller in the project.
 *
 * MongoDB Concepts:
 *  1. Atomic findOneAndUpdate with condition — prevents overbooking
 *  2. $inc operator — atomic increment/decrement
 *  3. MongoDB Transactions (session.withTransaction) — multi-doc atomicity
 *  4. Unique compound index — one registration per student per event
 *  5. Aggregation for waitlist management
 */
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Notification = require('../models/Notification');
const { auditLog } = require('../services/auditService');
const { sendEmail, emailTemplates } = require('../services/emailService');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// ── REGISTER FOR EVENT ────────────────────────────────────────────────────────
exports.register = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const studentId = req.user._id;

  // MongoDB Concept: Transactions
  // A MongoDB transaction ensures that multiple document operations are ATOMIC:
  // Either ALL succeed, or ALL are rolled back.
  // This is critical here because we:
  //   1. Check if event has capacity
  //   2. Create a registration document
  //   3. Increment event.registeredCount
  // Without a transaction, a crash between steps 2 and 3 would leave data inconsistent.
  //
  // Note: Transactions require a REPLICA SET (MongoDB Atlas provides this by default).
  const session = await mongoose.startSession();

  let registration;
  let status;

  try {
    await session.withTransaction(async () => {
      // ── Step 1: Atomic capacity check + increment ─────────────────────────
      // MongoDB Concept: findOneAndUpdate with CONDITION
      // This is the KEY to preventing overbooking. The condition
      // { registeredCount: { $lt: capacity } } means:
      // "Only update if there's still space." If full, returns null.
      //
      // Using $inc is atomic at the document level — concurrent requests
      // both trying to increment will result in exactly 2 increments,
      // not "both see 9, both write 10" (which SQL without locks might do).
      const event = await Event.findOneAndUpdate(
        {
          _id: eventId,
          status: 'published',
          startDate: { $gt: new Date() },
          $expr: { $lt: ['$registeredCount', '$capacity'] }, // Has space
        },
        { $inc: { registeredCount: 1 } }, // Atomic increment
        { new: true, session } // Use our transaction session
      );

      if (!event) {
        // Either event doesn't exist, isn't published, or is full
        // We need to check which case it is
        const existingEvent = await Event.findById(eventId).session(session);
        if (!existingEvent) throw ApiError.notFound('Event not found');
        if (existingEvent.status !== 'published') throw ApiError.badRequest('Event is not open for registration');
        if (existingEvent.startDate <= new Date()) throw ApiError.badRequest('Event has already started');

        // Event is FULL — add to waitlist
        const waitlistCount = await Registration.countDocuments({
          event: eventId,
          status: 'waitlisted',
        }).session(session);

        registration = await Registration.create(
          [{
            event: eventId,
            student: studentId,
            status: 'waitlisted',
            waitlistPosition: waitlistCount + 1,
            source: req.body.source || 'direct',
          }],
          { session }
        );
        registration = registration[0];
        status = 'waitlisted';
        return;
      }

      // MongoDB Concept: QR Code generation
      // We generate a unique QR token and create a QR code PNG data URL
      const qrToken = require('crypto').randomUUID();
      const qrCodeDataUrl = await QRCode.toDataURL(qrToken, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 300,
      });

      // Create registration document inside the transaction
      registration = await Registration.create(
        [{
          event: eventId,
          student: studentId,
          status: 'registered',
          qrToken,
          qrCodeDataUrl,
          source: req.body.source || 'direct',
        }],
        { session }
      );
      registration = registration[0];
      status = 'registered';
    });
  } catch (err) {
    // The transaction was aborted. MongoDB automatically rolled back all changes.
    await session.endSession();

    // Re-throw known API errors
    if (err.isOperational) throw err;

    // Duplicate key = student already registered
    if (err.code === 11000) {
      throw ApiError.conflict('You are already registered for this event');
    }

    throw err;
  } finally {
    await session.endSession();
  }

  // ── Post-registration (outside transaction) ────────────────────────────────
  // Send notification (non-critical, failures don't affect registration)
  await Notification.create({
    user: studentId,
    type: status === 'registered' ? 'registration_confirmed' : 'waitlisted',
    title: status === 'registered' ? 'Registration Confirmed!' : 'Added to Waitlist',
    message: status === 'registered'
      ? 'Your spot is confirmed. Check your QR code for check-in.'
      : 'The event is full. You\'ve been added to the waitlist and will be notified if a spot opens.',
    relatedEntity: { entityType: 'Registration', entityId: registration._id },
  });

  // Send email (non-blocking)
  const event = await Event.findById(eventId).populate('venue', 'name');
  sendEmail({
    to: req.user.email,
    ...emailTemplates.registrationConfirmed({
      studentName: req.user.name,
      eventTitle: event.title,
      startDate: event.startDate.toLocaleString('en-IN'),
      venueName: event.venue?.name,
      qrToken: registration.qrToken,
    }),
  }).catch(console.error);

  await auditLog({
    actor: req.user, action: 'registration.create', entity: 'Registration',
    entityId: registration._id, meta: { eventId, status }, ipAddress: req.ip,
  });

  res.status(201).json({
    success: true,
    message: status === 'registered'
      ? 'Successfully registered! Check your QR code.'
      : 'Event is full. You\'ve been added to the waitlist.',
    data: {
      _id: registration._id,
      status: registration.status,
      qrToken: registration.qrToken,
      waitlistPosition: registration.waitlistPosition,
    },
  });
});

// ── CANCEL REGISTRATION ───────────────────────────────────────────────────────
exports.cancelRegistration = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const reg = await Registration.findOne({
        event: req.params.eventId,
        student: req.user._id,
        status: { $in: ['registered', 'waitlisted'] },
      }).session(session);

      if (!reg) throw ApiError.notFound('No active registration found for this event');

      const event = await Event.findById(reg.event).session(session);
      if (event.startDate <= new Date()) {
        throw ApiError.badRequest('Cannot cancel after event has started');
      }

      // Update registration to cancelled
      reg.status = 'cancelled';
      reg.cancelledAt = new Date();
      reg.cancellationReason = req.body.reason;
      await reg.save({ session });

      if (reg.status !== 'waitlisted') {
        // Decrement registeredCount on the event
        await Event.updateOne(
          { _id: reg.event },
          { $inc: { registeredCount: -1 } },
          { session }
        );

        // MongoDB Concept: Find oldest waitlisted student for auto-promotion
        // We query for the waitlisted registration with the lowest waitlistPosition
        const nextWaitlisted = await Registration.findOneAndUpdate(
          {
            event: reg.event,
            status: 'waitlisted',
          },
          {
            $set: { status: 'registered' },
            $unset: { waitlistPosition: '' },
          },
          {
            sort: { waitlistPosition: 1 }, // Oldest first (lowest position number)
            new: true,
            session,
          }
        );

        if (nextWaitlisted) {
          // Increment registeredCount back for the promoted student
          await Event.updateOne(
            { _id: reg.event },
            { $inc: { registeredCount: 1 } },
            { session }
          );

          // Generate QR code for newly promoted student
          const qrToken = require('crypto').randomUUID();
          const qrCodeDataUrl = await QRCode.toDataURL(qrToken, { width: 300 });
          await Registration.updateOne(
            { _id: nextWaitlisted._id },
            { $set: { qrToken, qrCodeDataUrl } },
            { session }
          );

          // Notify the promoted student (outside session since notification is non-critical)
          await Notification.create({
            user: nextWaitlisted.student,
            type: 'waitlist_promoted',
            title: 'You got a spot!',
            message: `A spot opened up in "${event.title}". You're now registered!`,
            relatedEntity: { entityType: 'Event', entityId: event._id },
          });
        }
      }
    });
  } finally {
    await session.endSession();
  }

  res.json({ success: true, message: 'Registration cancelled successfully' });
});

// ── CHECK-IN VIA QR TOKEN ─────────────────────────────────────────────────────
exports.checkIn = asyncHandler(async (req, res) => {
  const { qrToken } = req.body;

  // MongoDB Concept: O(1) lookup using the qrToken index
  const reg = await Registration.findOne({ qrToken })
    .populate('student', 'name email')
    .populate('event', 'title startDate endDate organizer');

  if (!reg) throw ApiError.notFound('Invalid QR code');

  // Verify organizer owns this event
  if (req.user.role === 'organizer') {
    if (reg.event.organizer.toString() !== req.user._id.toString()) {
      throw ApiError.forbidden('Not authorized to check in to this event');
    }
  }

  if (reg.status === 'checked-in') {
    return res.json({ success: true, message: 'Already checked in', data: reg, alreadyCheckedIn: true });
  }

  if (reg.status !== 'registered') {
    throw ApiError.badRequest(`Cannot check in — registration status is: ${reg.status}`);
  }

  reg.status = 'checked-in';
  reg.checkedInAt = new Date();
  await reg.save();

  await Notification.create({
    user: reg.student._id,
    type: 'check_in_confirmed',
    title: 'Check-in Confirmed!',
    message: `You've been checked in to "${reg.event.title}". Enjoy the event!`,
    relatedEntity: { entityType: 'Registration', entityId: reg._id },
  });

  res.json({
    success: true,
    message: `✅ Checked in: ${reg.student.name}`,
    data: {
      studentName: reg.student.name,
      studentEmail: reg.student.email,
      eventTitle: reg.event.title,
      checkedInAt: reg.checkedInAt,
    },
  });
});

// ── GET MY REGISTRATIONS ──────────────────────────────────────────────────────
exports.getMyRegistrations = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const filter = { student: req.user._id };
  if (status) filter.status = status;

  const total = await Registration.countDocuments(filter);
  const registrations = await Registration.find(filter)
    .populate({
      path: 'event',
      select: 'title category startDate endDate posterUrl status avgRating',
      populate: { path: 'venue', select: 'name address' },
    })
    .sort('-createdAt')
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  res.json({
    success: true,
    data: registrations,
    pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
  });
});

// ── GET QR CODE ───────────────────────────────────────────────────────────────
exports.getQRCode = asyncHandler(async (req, res) => {
  const reg = await Registration.findOne({
    event: req.params.eventId,
    student: req.user._id,
    status: 'registered',
  }).select('+qrCodeDataUrl');

  if (!reg) throw ApiError.notFound('Registration not found');

  res.json({ success: true, data: { qrToken: reg.qrToken, qrCodeDataUrl: reg.qrCodeDataUrl } });
});

// ── GET EVENT ATTENDEES (Organizer/Admin) ─────────────────────────────────────
exports.getAttendees = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { status, page = 1, limit = 20, search } = req.query;

  const event = await Event.findById(eventId);
  if (!event) throw ApiError.notFound('Event not found');

  if (req.user.role === 'organizer' && event.organizer.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Not authorized');
  }

  const filter = { event: eventId };
  if (status) {
    filter.status = status;
  } else if (req.user.role === 'student') {
    filter.status = { $in: ['registered', 'checked-in'] };
  }

  // Sanitize fields based on role: students see name, interests, avatar for networking
  const studentFields = req.user.role === 'student' ? 'name interests avatar' : 'name email phone avatar';
  let query = Registration.find(filter)
    .populate('student', studentFields);


  if (search) {
    // MongoDB Concept: When using populate with search, we need to match after populate.
    // More efficient: use aggregation with $lookup for server-side filtering.
    const students = await Registration.aggregate([
      { $match: { event: new mongoose.Types.ObjectId(eventId) } },
      { $lookup: { from: 'users', localField: 'student', foreignField: '_id', as: 'student' } },
      { $unwind: '$student' },
      {
        $match: {
          $or: [
            { 'student.name': { $regex: search, $options: 'i' } },
            { 'student.email': { $regex: search, $options: 'i' } },
          ],
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: parseInt(limit) },
    ]);

    return res.json({ success: true, data: students });
  }

  const total = await Registration.countDocuments(filter);
  const attendees = await query
    .sort('-createdAt')
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  res.json({
    success: true,
    data: attendees,
    pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
  });
});

// ── CONCURRENCY DEMO: 20 simultaneous requests ────────────────────────────────
// Used for the DB Lab page presentation demo
exports.concurrencyDemo = asyncHandler(async (req, res) => {
  const { eventId } = req.body;

  // This endpoint simulates the result (actual concurrency is done client-side)
  const event = await Event.findById(eventId);
  if (!event) throw ApiError.notFound('Event not found');

  const registrations = await Registration.find({ event: eventId })
    .countDocuments();

  res.json({
    success: true,
    message: 'Concurrency demo completed',
    data: {
      eventCapacity: event.capacity,
      registeredCount: event.registeredCount,
      totalAttempts: registrations,
      waitlisted: await Registration.countDocuments({ event: eventId, status: 'waitlisted' }),
      registered: await Registration.countDocuments({ event: eventId, status: 'registered' }),
    },
  });
});
