/**
 * CRON JOB SERVICE
 * ----------------
 * node-cron schedules background tasks.
 *
 * Jobs:
 *  1. Send 24-hour reminders before events (runs every hour)
 *  2. Mark no-shows for past events (runs daily at midnight)
 *  3. Mark completed events (runs every 30 mins)
 */
const cron = require('node-cron');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Notification = require('../models/Notification');
const { sendEmail, emailTemplates } = require('./emailService');

const startCronJobs = () => {
  console.log('⏰ Starting cron jobs...');

  // ── Job 1: Send 24-hour reminders ──────────────────────────────────────────
  // Runs every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

      // Find events starting in the next 24-25 hour window
      const events = await Event.find({
        status: 'published',
        startDate: { $gte: in24h, $lte: in25h },
      }).populate('venue', 'name');

      for (const event of events) {
        // Find all registered students for this event
        const registrations = await Registration.find({
          event: event._id,
          status: 'registered',
        }).populate('student', 'name email');

        for (const reg of registrations) {
          // Create in-app notification
          await Notification.create({
            user: reg.student._id,
            type: 'event_reminder',
            title: `⏰ Reminder: ${event.title} starts tomorrow!`,
            message: `Don't forget! "${event.title}" starts at ${event.startDate.toLocaleString('en-IN')}. Remember your QR code!`,
            relatedEntity: { entityType: 'Event', entityId: event._id },
          });

          // Send email reminder
          sendEmail({
            to: reg.student.email,
            ...emailTemplates.eventReminder({
              studentName: reg.student.name,
              eventTitle: event.title,
              startDate: event.startDate.toLocaleString('en-IN'),
              venueName: event.venue?.name,
            }),
          }).catch(console.error);
        }

        console.log(`✅ Sent reminders for: ${event.title} (${registrations.length} students)`);
      }
    } catch (err) {
      console.error('❌ Reminder cron error:', err.message);
    }
  });

  // ── Job 2: Mark no-shows ───────────────────────────────────────────────────
  // Runs daily at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      const now = new Date();

      // Find past events (endDate < now)
      const pastEvents = await Event.find({
        endDate: { $lt: now },
        status: 'published',
      }).select('_id');

      // MongoDB Concept: updateMany — bulk update all matching documents atomically
      const result = await Registration.updateMany(
        {
          event: { $in: pastEvents.map(e => e._id) },
          status: 'registered', // Never checked in
        },
        { $set: { status: 'no-show' } }
      );

      // Mark events as completed
      await Event.updateMany(
        { _id: { $in: pastEvents.map(e => e._id) } },
        { $set: { status: 'completed' } }
      );

      if (result.modifiedCount > 0) {
        console.log(`⚠️  Marked ${result.modifiedCount} registrations as no-show`);
      }
    } catch (err) {
      console.error('❌ No-show cron error:', err.message);
    }
  });

  // ── Job 3: Mark completed events ───────────────────────────────────────────
  // Runs every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      await Event.updateMany(
        { endDate: { $lt: new Date() }, status: 'published' },
        { $set: { status: 'completed' } }
      );
    } catch (err) {
      console.error('❌ Complete-events cron error:', err.message);
    }
  });

  console.log('✅ Cron jobs started');
};

module.exports = { startCronJobs };
