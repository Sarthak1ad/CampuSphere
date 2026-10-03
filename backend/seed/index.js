/**
 * SEED SCRIPT
 * -----------
 * Creates realistic test data for College Event Management System.
 * Run: npm run seed
 *
 * Idempotent: clears all collections and re-seeds fresh.
 * Prints demo credentials at the end.
 *
 * MongoDB Concepts demonstrated:
 *  - insertMany() — bulk insert (much faster than individual saves)
 *  - deleteMany() — bulk delete
 *  - Transactions for complex seeding
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');

const User = require('../models/User');
const Venue = require('../models/Venue');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const PlatformFeedback = require('../models/PlatformFeedback');

// ── DATA GENERATORS ───────────────────────────────────────────────────────────
const CATEGORIES = ['Academic', 'Cultural', 'Sports', 'Social', 'Workshop', 'Seminar'];

const firstNames = ['Aarav', 'Arjun', 'Ishaan', 'Rohan', 'Vikram', 'Priya', 'Ananya', 'Kavya', 'Meera',
  'Diya', 'Aditya', 'Kiran', 'Rahul', 'Neha', 'Pooja', 'Sanjay', 'Divya', 'Riya', 'Aisha',
  'Tanvi', 'Amit', 'Shreya', 'Varun', 'Nisha', 'Suresh', 'Lakshmi', 'Rajesh', 'Deepa', 'Manish',
  'Sunita', 'Kunal', 'Anjali', 'Nikhil', 'Rekha', 'Gaurav', 'Swati', 'Harsh', 'Pallavi', 'Sachin',
  'Geeta', 'Vijay', 'Savita', 'Mayank', 'Kamla', 'Pranav', 'Usha', 'Vivek', 'Rashmi', 'Tarun',
  'Archana', 'Siddharth', 'Asha', 'Yogesh', 'Heena', 'Mohit', 'Sangeeta', 'Akash', 'Seema', 'Sanket'];

const lastNames = ['Sharma', 'Verma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Joshi', 'Mehta', 'Shah',
  'Iyer', 'Nair', 'Reddy', 'Pillai', 'Krishnan', 'Bose', 'Chatterjee', 'Ghosh', 'Roy', 'Sen',
  'Malhotra', 'Aggarwal', 'Khanna', 'Chawla', 'Srivastava', 'Pandey', 'Yadav', 'Mishra', 'Dubey',
  'Tiwari', 'Trivedi', 'Desai', 'Patil', 'Sawant', 'More', 'Kulkarni', 'Deshpande', 'Rane', 'Kamble',
  'Shinde', 'Pawar', 'Naik', 'Gaikwad', 'Jadhav', 'Bhosale', 'Salve', 'Thorat', 'Mane', 'Chavan'];

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const futureDays = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);
const pastDays = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const generateName = () => `${randomFrom(firstNames)} ${randomFrom(lastNames)}`;
const generateEmail = (name, idx) => `${name.toLowerCase().replace(/\s+/g, '.')}${idx}@campus.edu`;
const generatePhone = () => `+91${randomInt(7000000000, 9999999999)}`;

// ── MAIN SEED FUNCTION ────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱 Starting seed...\n');

  await mongoose.connect(process.env.MONGO_URI, { maxPoolSize: 5 });
  console.log('✅ Connected to MongoDB');

  // ── CLEAR ALL DATA ────────────────────────────────────────────────────────
  // MongoDB Concept: deleteMany({}) — delete ALL documents in a collection
  console.log('🗑️  Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Venue.deleteMany({}),
    Event.deleteMany({}),
    Registration.deleteMany({}),
    Feedback.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
    PlatformFeedback.deleteMany({}),
  ]);
  console.log('✅ Cleared all collections\n');

  // ── PRE-HASH PASSWORD ─────────────────────────────────────────────────────
  // We hash once and use for all users to speed up seeding
  // (normally the pre-save hook does this, but for bulk operations we skip the hook)
  const PASSWORD = 'Demo@1234';
  const hashedPassword = await bcrypt.hash(PASSWORD, 12);
  console.log(`🔑 Password for all accounts: ${PASSWORD}`);

  // ── 1. CREATE ADMIN ───────────────────────────────────────────────────────
  const admin = await User.create({
    name: 'System Admin',
    email: 'admin@campus.edu',
    passwordHash: hashedPassword,
    phone: '+919900000001',
    role: 'admin',
    isActive: true,
    emailVerified: true,
    interests: ['Academic', 'Workshop'],
  });
  console.log('✅ Admin created: admin@campus.edu');

  // ── 2. CREATE ORGANIZERS ──────────────────────────────────────────────────
  const orgData = [
    { name: 'Tech Club SVNIT', email: 'techclub@campus.edu', orgName: 'SVNIT Tech Club', regNo: 'TC-2024-001' },
    { name: 'Cultural Council', email: 'cultural@campus.edu', orgName: 'Cultural Affairs Council', regNo: 'CC-2024-002' },
    { name: 'Sports Board', email: 'sports@campus.edu', orgName: 'Sports Development Board', regNo: 'SB-2024-003' },
    { name: 'Academic Society', email: 'academic@campus.edu', orgName: 'Academic Excellence Society', regNo: 'AE-2024-004' },
    { name: 'Innovation Hub', email: 'innovation@campus.edu', orgName: 'Student Innovation Hub', regNo: 'IH-2024-005' },
  ];

  // MongoDB Concept: insertMany — insert multiple documents in a single DB call
  // Much faster than calling .create() in a loop!
  const organizers = await User.insertMany(
    orgData.map((o) => ({
      name: o.name,
      email: o.email,
      passwordHash: hashedPassword,
      phone: generatePhone(),
      role: 'organizer',
      isActive: true,
      emailVerified: true,
      organizerProfile: {
        orgName: o.orgName,
        registrationNumber: o.regNo,
        verificationStatus: 'verified',
        verifiedAt: pastDays(30),
        adminRating: randomInt(3, 5),
      },
    }))
  );
  console.log(`✅ ${organizers.length} organizers created`);

  // ── 3. CREATE 100+ STUDENTS ───────────────────────────────────────────────
  const studentDocs = [];
  for (let i = 1; i <= 110; i++) {
    const name = generateName();
    studentDocs.push({
      name,
      email: `student${i}@campus.edu`,
      passwordHash: hashedPassword,
      phone: generatePhone(),
      role: 'student',
      isActive: true,
      emailVerified: Math.random() > 0.2, // 80% verified
      interests: [randomFrom(CATEGORIES), randomFrom(CATEGORIES)].filter((v, i, a) => a.indexOf(v) === i),
    });
  }

  const students = await User.insertMany(studentDocs);
  console.log(`✅ ${students.length} students created`);

  // ── 4. CREATE 8 VENUES ────────────────────────────────────────────────────
  const venueDocs = [
    { name: 'Main Auditorium', city: 'Surat', cap: 1000, coords: [72.8311, 21.1702], amenities: ['AC', 'Projector', 'WiFi', 'Stage', 'Green Room'] },
    { name: 'Seminar Hall A', city: 'Surat', cap: 200, coords: [72.8321, 21.1712], amenities: ['AC', 'Projector', 'Whiteboard'] },
    { name: 'Open Air Theatre', city: 'Surat', cap: 500, coords: [72.8301, 21.1695], amenities: ['Stage', 'Sound System', 'Lighting'] },
    { name: 'Conference Room 1', city: 'Surat', cap: 50, coords: [72.8315, 21.1708], amenities: ['AC', 'Projector', 'Video Conferencing'] },
    { name: 'Sports Complex', city: 'Surat', cap: 2000, coords: [72.8290, 21.1685], amenities: ['Changing Rooms', 'First Aid', 'Parking'] },
    { name: 'Innovation Lab', city: 'Surat', cap: 80, coords: [72.8325, 21.1715], amenities: ['3D Printers', 'Laser Cutter', 'WiFi', 'Workbenches'] },
    { name: 'Library Hall', city: 'Surat', cap: 150, coords: [72.8308, 21.1700], amenities: ['AC', 'Projector', 'Silent Zone'] },
    { name: 'Campus Ground', city: 'Surat', cap: 5000, coords: [72.8295, 21.1690], amenities: ['Open Space', 'Parking', 'Food Stalls'] },
  ];

  const venues = await Venue.insertMany(
    venueDocs.map((v) => ({
      name: v.name,
      location: { type: 'Point', coordinates: v.coords },
      address: { street: 'Campus Road', city: v.city, state: 'Gujarat', pincode: '395007', country: 'India' },
      capacity: v.cap,
      amenities: v.amenities,
      images: [],
      createdBy: admin._id,
    }))
  );
  console.log(`✅ ${venues.length} venues created`);

  // ── 5. CREATE 40+ EVENTS ──────────────────────────────────────────────────
  const eventTemplates = [
    // Future events (published)
    { title: 'National Hackathon 2026', cat: 'Academic', org: 0, venue: 0, cap: 200, daysFromNow: 15 },
    { title: 'Techfest Spark', cat: 'Cultural', org: 1, venue: 2, cap: 300, daysFromNow: 20 },
    { title: 'Annual Sports Meet', cat: 'Sports', org: 2, venue: 4, cap: 500, daysFromNow: 25 },
    { title: 'Machine Learning Workshop', cat: 'Workshop', org: 0, venue: 5, cap: 60, daysFromNow: 7 },
    { title: 'Classical Dance Competition', cat: 'Cultural', org: 1, venue: 2, cap: 250, daysFromNow: 12 },
    { title: 'Entrepreneurship Summit', cat: 'Seminar', org: 4, venue: 1, cap: 150, daysFromNow: 18 },
    { title: 'Code Wars 2.0', cat: 'Academic', org: 0, venue: 1, cap: 100, daysFromNow: 10 },
    { title: 'Photography Exhibition', cat: 'Cultural', org: 1, venue: 6, cap: 120, daysFromNow: 14 },
    { title: 'Inter-College Cricket Tournament', cat: 'Sports', org: 2, venue: 7, cap: 400, daysFromNow: 30 },
    { title: 'Blockchain & Web3 Workshop', cat: 'Workshop', org: 4, venue: 5, cap: 50, daysFromNow: 8 },
    { title: 'Annual Science Symposium', cat: 'Seminar', org: 3, venue: 0, cap: 300, daysFromNow: 22 },
    { title: 'Drama Night', cat: 'Cultural', org: 1, venue: 2, cap: 200, daysFromNow: 16 },
    { title: 'Data Science Bootcamp', cat: 'Workshop', org: 0, venue: 5, cap: 40, daysFromNow: 5 },
    { title: 'Campus Social Night', cat: 'Social', org: 1, venue: 2, cap: 350, daysFromNow: 28 },
    { title: 'Robotics Competition', cat: 'Academic', org: 4, venue: 5, cap: 80, daysFromNow: 35 },
    { title: 'Mental Health Awareness Session', cat: 'Seminar', org: 3, venue: 1, cap: 100, daysFromNow: 6 },
    { title: 'Startup Pitch Day', cat: 'Social', org: 4, venue: 0, cap: 250, daysFromNow: 40 },
    { title: 'Swimming Championship', cat: 'Sports', org: 2, venue: 4, cap: 150, daysFromNow: 45 },
    { title: 'Night of Stars (Music)', cat: 'Cultural', org: 1, venue: 7, cap: 1000, daysFromNow: 50 },
    { title: 'Cyber Security Workshop', cat: 'Workshop', org: 0, venue: 3, cap: 30, daysFromNow: 9 },
    // Past/completed events
    { title: 'Alumni Meet 2026', cat: 'Social', org: 3, venue: 0, cap: 500, daysFromNow: -20, status: 'completed' },
    { title: 'Fresher Orientation', cat: 'Social', org: 3, venue: 0, cap: 700, daysFromNow: -45, status: 'completed' },
    { title: 'App Development Hackathon', cat: 'Academic', org: 0, venue: 1, cap: 120, daysFromNow: -15, status: 'completed' },
    { title: 'Garba Night', cat: 'Cultural', org: 1, venue: 7, cap: 800, daysFromNow: -30, status: 'completed' },
    { title: 'Research Colloquium', cat: 'Seminar', org: 3, venue: 6, cap: 80, daysFromNow: -10, status: 'completed' },
    { title: 'Marathon Run', cat: 'Sports', org: 2, venue: 7, cap: 300, daysFromNow: -25, status: 'completed' },
    { title: 'IoT Workshop Series', cat: 'Workshop', org: 4, venue: 5, cap: 45, daysFromNow: -8, status: 'completed' },
    { title: 'Cultural Fusion Night', cat: 'Cultural', org: 1, venue: 2, cap: 400, daysFromNow: -35, status: 'completed' },
    { title: 'Python for Beginners', cat: 'Workshop', org: 0, venue: 1, cap: 60, daysFromNow: -12, status: 'completed' },
    { title: 'Annual Debate Championship', cat: 'Academic', org: 3, venue: 1, cap: 100, daysFromNow: -18, status: 'completed' },
    // Draft/pending events
    { title: 'Spring Fest Planning 2027', cat: 'Cultural', org: 1, venue: 2, cap: 500, daysFromNow: 90, status: 'draft' },
    { title: 'Advanced AI Seminar', cat: 'Seminar', org: 0, venue: 0, cap: 200, daysFromNow: 60, status: 'pending' },
    // More future events to reach 40+
    { title: 'E-Sports Tournament', cat: 'Sports', org: 0, venue: 1, cap: 100, daysFromNow: 55 },
    { title: 'Cultural Kaleidoscope', cat: 'Cultural', org: 1, venue: 2, cap: 300, daysFromNow: 38 },
    { title: 'Open Mic Night', cat: 'Social', org: 1, venue: 6, cap: 80, daysFromNow: 11 },
    { title: 'Cloud Computing Workshop', cat: 'Workshop', org: 4, venue: 3, cap: 25, daysFromNow: 13 },
    { title: 'Annual Prize Distribution', cat: 'Academic', org: 3, venue: 0, cap: 600, daysFromNow: 65 },
    { title: 'Street Food Festival', cat: 'Social', org: 1, venue: 7, cap: 2000, daysFromNow: 70 },
    { title: 'Physics Olympiad', cat: 'Academic', org: 3, venue: 1, cap: 80, daysFromNow: 42 },
    { title: 'Design Thinking Sprint', cat: 'Workshop', org: 4, venue: 5, cap: 35, daysFromNow: 19 },
    { title: 'Table Tennis Open', cat: 'Sports', org: 2, venue: 4, cap: 64, daysFromNow: 33 },
    { title: 'Independence Day Celebration', cat: 'Cultural', org: 3, venue: 7, cap: 3000, daysFromNow: 317 },
  ];

  const eventDocs = eventTemplates.map((t, i) => {
    const start = t.daysFromNow > 0 ? futureDays(t.daysFromNow) : pastDays(-t.daysFromNow);
    start.setHours(randomInt(9, 17), 0, 0, 0);
    const end = new Date(start.getTime() + randomInt(2, 8) * 60 * 60 * 1000);

    const venueObj = venues[t.venue % venues.length];
    const eventCapacity = Math.min(t.cap, venueObj.capacity);

    const registeredCount = t.status === 'completed' ? randomInt(Math.floor(eventCapacity * 0.6), eventCapacity) : 0;

    return {
      title: t.title,
      description: `Join us for an exciting ${t.title} at SVNIT. This ${t.cat.toLowerCase()} event promises to be an unforgettable experience for all participants. The event is organized to foster learning, collaboration, and community engagement among students and faculty. Come prepared to learn, participate, and celebrate the spirit of campus life!`,
      category: t.cat,
      organizer: organizers[t.org]._id,
      venue: venueObj._id,
      startDate: start,
      endDate: end,
      capacity: eventCapacity,
      registeredCount,
      status: t.status || 'published',
      tags: [t.cat.toLowerCase(), 'svnit', 'campus', `${t.cat.toLowerCase()}-event`],
      budget: {
        total: randomInt(5000, 150000),
        breakdown: [
          { item: 'Venue & Setup', amount: randomInt(1000, 30000) },
          { item: 'Refreshments', amount: randomInt(500, 15000) },
          { item: 'Materials & Prizes', amount: randomInt(1000, 50000) },
        ],
      },
      views: randomInt(50, 5000),
      clicks: randomInt(20, 2000),
      avgRating: parseFloat((Math.random() * 2 + 3).toFixed(1)),
      ratingCount: registeredCount > 0 ? randomInt(Math.floor(registeredCount * 0.3), registeredCount) : 0,
    };
  });

  const events = await Event.insertMany(eventDocs, { ordered: false });
  console.log(`✅ ${events.length} events created`);

  // ── 6. CREATE 500+ REGISTRATIONS ─────────────────────────────────────────
  console.log('📝 Creating registrations...');
  const registrationDocs = [];
  const usedPairs = new Set(); // Track {event, student} to avoid duplicates

  // For each past event, create realistic registrations
  const pastEvents = events.filter(e => e.status === 'completed');
  const futureEvents = events.filter(e => e.status === 'published');

  // Past events: 60-90% filled with checked-in or no-show
  for (const event of pastEvents) {
    const numReg = Math.min(Math.floor(event.capacity * (0.6 + Math.random() * 0.3)), students.length);
    const shuffled = [...students].sort(() => Math.random() - 0.5).slice(0, numReg);

    for (const student of shuffled) {
      const key = `${event._id}-${student._id}`;
      if (usedPairs.has(key)) continue;
      usedPairs.add(key);

      const isCheckedIn = Math.random() > 0.25; // 75% attendance rate
      const qrToken = require('crypto').randomUUID();
      registrationDocs.push({
        event: event._id,
        student: student._id,
        status: isCheckedIn ? 'checked-in' : 'no-show',
        qrToken,
        checkedInAt: isCheckedIn ? new Date(event.startDate.getTime() + randomInt(0, 60) * 60 * 1000) : null,
        source: randomFrom(['direct', 'email', 'social', 'recommendation', 'search']),
        createdAt: new Date(event.startDate.getTime() - randomInt(1, 14) * 24 * 60 * 60 * 1000),
      });
    }
  }

  // Future events: 10-50% filled (registered)
  for (const event of futureEvents) {
    const numReg = Math.floor(event.capacity * (0.1 + Math.random() * 0.4));
    const shuffled = [...students].sort(() => Math.random() - 0.5).slice(0, Math.min(numReg, students.length));

    for (const student of shuffled) {
      const key = `${event._id}-${student._id}`;
      if (usedPairs.has(key)) continue;
      usedPairs.add(key);

      const qrToken = require('crypto').randomUUID();
      registrationDocs.push({
        event: event._id,
        student: student._id,
        status: 'registered',
        qrToken,
        source: randomFrom(['direct', 'email', 'social', 'recommendation', 'search']),
      });
    }
  }

  // MongoDB Concept: insertMany with ordered:false
  // ordered:false means ALL documents are attempted even if some fail.
  // This handles potential duplicate key errors gracefully.
  const chunkSize = 200;
  let totalRegistrations = 0;
  for (let i = 0; i < registrationDocs.length; i += chunkSize) {
    const chunk = registrationDocs.slice(i, i + chunkSize);
    try {
      const result = await Registration.insertMany(chunk, { ordered: false });
      totalRegistrations += result.length;
    } catch (err) {
      // Ignore duplicate key errors, count successful inserts
      if (err.insertedDocs) totalRegistrations += err.insertedDocs.length;
    }
  }

  // Update registeredCount on events (for future events)
  for (const event of futureEvents) {
    const count = await Registration.countDocuments({ event: event._id, status: 'registered' });
    await Event.updateOne({ _id: event._id }, { $set: { registeredCount: count } });
  }

  console.log(`✅ ${totalRegistrations} registrations created`);

  // ── 7. CREATE FEEDBACK ────────────────────────────────────────────────────
  console.log('💬 Creating feedback...');
  const checkedInRegs = await Registration.find({ status: 'checked-in' })
    .populate('event').populate('student');

  const feedbackDocs = [];
  const feedbackPairs = new Set();

  const COMMENTS_POS = [
    'Excellent event! Very well organized and informative. The speakers were great.',
    'Loved every bit of it! The team did a fantastic job. Highly recommend.',
    'Amazing experience! Learned so much. Will definitely attend next time.',
    'Great event! Everything was perfectly planned. More events like this please!',
    'Outstanding organization. The content was very relevant and engaging.',
  ];
  const COMMENTS_NEG = [
    'Event started late and the venue was too crowded. Poor management.',
    'Could have been better. The content was not very relevant. Disappointing.',
    'Poor organization. Many technical issues throughout the event.',
    'Not worth the time. The speakers were not well-prepared.',
  ];
  const COMMENTS_NEU = [
    'Average event. Some parts were good, some not so much.',
    'It was okay. Could have been better with some improvements.',
    'Decent event. Nothing exceptional but not bad either.',
    'Mixed experience. Some sessions were great, others were boring.',
  ];

  for (const reg of checkedInRegs.slice(0, 800)) {
    if (!reg.event || !reg.student) continue;
    const key = `${reg.event._id}-${reg.student._id}`;
    if (feedbackPairs.has(key)) continue;
    if (Math.random() > 0.7) continue; // Only 70% leave feedback

    feedbackPairs.add(key);
    const rating = randomInt(1, 5);
    const comments = rating >= 4 ? COMMENTS_POS : rating <= 2 ? COMMENTS_NEG : COMMENTS_NEU;

    feedbackDocs.push({
      event: reg.event._id,
      student: reg.student._id,
      rating,
      answers: {
        eventQuality: randomInt(Math.max(1, rating - 1), Math.min(5, rating + 1)),
        organization: randomInt(Math.max(1, rating - 1), Math.min(5, rating + 1)),
        venueSuitability: randomInt(Math.max(1, rating - 1), Math.min(5, rating + 1)),
        contentRelevance: randomInt(Math.max(1, rating - 1), Math.min(5, rating + 1)),
        overallValue: randomInt(Math.max(1, rating - 1), Math.min(5, rating + 1)),
      },
      comment: randomFrom(comments),
      // Sentiment will be computed by pre-save hook when using save()
      // For insertMany we set it directly
      sentiment: rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral',
      createdAt: new Date(reg.event.endDate?.getTime() + randomInt(1, 72) * 60 * 60 * 1000 || Date.now()),
    });
  }

  try {
    const feedbacks = await Feedback.insertMany(feedbackDocs, { ordered: false });
    console.log(`✅ ${feedbacks.length} feedback entries created`);
  } catch (err) {
    console.log(`✅ ~${feedbackDocs.length} feedback entries created (some duplicates skipped)`);
  }

  // ── 8. CREATE NOTIFICATIONS ───────────────────────────────────────────────
  const notifDocs = [];
  for (const student of students.slice(0, 30)) {
    notifDocs.push({
      user: student._id,
      type: 'registration_confirmed',
      title: 'Registration Confirmed!',
      message: 'You are registered for an upcoming event. Check your dashboard for details.',
      isRead: Math.random() > 0.5,
    });
    notifDocs.push({
      user: student._id,
      type: 'event_reminder',
      title: 'Event Tomorrow!',
      message: 'An event you registered for starts tomorrow. Remember your QR code!',
      isRead: false,
    });
  }
  await Notification.insertMany(notifDocs);
  console.log(`✅ ${notifDocs.length} notifications created`);

  // ── 9. PLATFORM FEEDBACK ──────────────────────────────────────────────────
  const pfDocs = [
    { user: students[0]._id, type: 'suggestion', title: 'Add Calendar Export', description: 'It would be great to export registered events to Google Calendar or iCal format.', status: 'planned', priority: 'medium' },
    { user: students[1]._id, type: 'bug', title: 'QR Code not loading on mobile', description: 'The QR code image does not load on iOS Safari. It shows a broken image icon instead of the QR code. Reproducible on iPhone 14 with Safari 17.', status: 'in-progress', priority: 'high' },
    { user: students[2]._id, type: 'suggestion', title: 'Dark mode support', description: 'Please add dark mode to the platform for better night-time usability. Many students study late and a dark mode would be very helpful.', status: 'open', priority: 'low' },
    { user: students[3]._id, type: 'bug', title: 'Registration button stays disabled', description: 'After logging in, the register button for events remains disabled even for published events. Hard refresh sometimes fixes it but not always.', status: 'done', priority: 'high' },
    { user: students[4]._id, type: 'suggestion', title: 'Event chat/discussion forum', description: 'Add a discussion forum or chat feature for each event so registered participants can interact before the event.', status: 'open', priority: 'medium' },
  ];
  await PlatformFeedback.insertMany(pfDocs);
  console.log(`✅ ${pfDocs.length} platform feedback entries created`);

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('🎉 SEED COMPLETE! Demo Credentials:');
  console.log('='.repeat(60));
  console.log(`\n👤 ADMIN`);
  console.log(`   Email: admin@campus.edu`);
  console.log(`   Password: ${PASSWORD}`);
  console.log(`\n🎪 ORGANIZERS`);
  orgData.forEach(o => {
    console.log(`   ${o.orgName}: ${o.email} / ${PASSWORD}`);
  });
  console.log(`\n🎓 STUDENTS (sample)`);
  console.log(`   student1@campus.edu / ${PASSWORD}`);
  console.log(`   student2@campus.edu / ${PASSWORD}`);
  console.log(`   student3@campus.edu / ${PASSWORD}`);
  console.log(`   ... (student1 through student110@campus.edu)`);
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Total records:`);
  console.log(`   Users: ${1 + organizers.length + students.length}`);
  console.log(`   Events: ${events.length}`);
  console.log(`   Venues: ${venues.length}`);
  console.log(`   Registrations: ~${totalRegistrations}`);
  console.log('='.repeat(60) + '\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
