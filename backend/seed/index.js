/**
 * COMPACT SEED SCRIPT
 * -------------------
 * Creates a clean, streamlined test dataset:
 * - 1 Admin
 * - 3 Organizers
 * - 10 Students
 * - 4 Venues
 * - 8 Events
 * - ~30 Registrations with QR Tokens & Waitlists
 * - 10 Feedbacks
 * - 5 Notifications & 3 Platform Bug Reports
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Venue = require('../models/Venue');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const PlatformFeedback = require('../models/PlatformFeedback');

const CATEGORIES = ['Academic', 'Cultural', 'Sports', 'Social', 'Workshop', 'Seminar'];

const studentNames = [
  'Aarav Sharma', 'Priya Patel', 'Rohan Verma', 'Ananya Gupta', 'Vikram Singh',
  'Kavya Iyer', 'Aditya Mehta', 'Sneha Rao', 'Rahul Nair', 'Diya Joshi'
];

const futureDays = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);
const pastDays = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

async function seed() {
  console.log('\n🌱 Starting clean seed (Compact Dataset)...\n');

  await mongoose.connect(process.env.MONGO_URI, { maxPoolSize: 5 });
  console.log('✅ Connected to MongoDB');

  // ── CLEAR ALL DATA ────────────────────────────────────────────────────────
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
  const PASSWORD = 'Demo@1234';
  const hashedPassword = await bcrypt.hash(PASSWORD, 12);
  console.log(`🔑 Password for all accounts: ${PASSWORD}`);

  // ── 1. CREATE ADMIN (1 User) ──────────────────────────────────────────────
  const [admin] = await User.insertMany([{
    name: 'System Admin',
    email: 'admin@campus.edu',
    passwordHash: hashedPassword,
    phone: '+919900000001',
    role: 'admin',
    isActive: true,
    emailVerified: true,
    interests: ['Academic', 'Workshop'],
  }]);
  console.log('✅ 1 Admin created: admin@campus.edu');

  // ── 2. CREATE ORGANIZERS (3 Users) ────────────────────────────────────────
  const orgData = [
    { name: 'Tech Club', email: 'techclub@campus.edu', orgName: 'SVNIT Tech Club', regNo: 'TC-2024-001' },
    { name: 'Cultural Council', email: 'cultural@campus.edu', orgName: 'Cultural Affairs Council', regNo: 'CC-2024-002' },
    { name: 'Sports Board', email: 'sports@campus.edu', orgName: 'Sports Development Board', regNo: 'SB-2024-003' },
  ];

  const organizers = await User.insertMany(
    orgData.map((o) => ({
      name: o.name,
      email: o.email,
      passwordHash: hashedPassword,
      phone: '+91980000000' + Math.floor(Math.random() * 9),
      role: 'organizer',
      isActive: true,
      emailVerified: true,
      organizerProfile: {
        orgName: o.orgName,
        registrationNumber: o.regNo,
        verificationStatus: 'verified',
        verifiedAt: pastDays(30),
        adminRating: 5,
      },
    }))
  );
  console.log(`✅ ${organizers.length} Organizers created`);

  // ── 3. CREATE STUDENTS (10 Users) ─────────────────────────────────────────
  const studentDocs = studentNames.map((name, idx) => ({
    name,
    email: `student${idx + 1}@campus.edu`,
    passwordHash: hashedPassword,
    phone: `+9197000000${idx < 10 ? '0' + idx : idx}`,
    role: 'student',
    isActive: true,
    emailVerified: true,
    interests: [CATEGORIES[idx % CATEGORIES.length], CATEGORIES[(idx + 2) % CATEGORIES.length]],
  }));

  const students = await User.insertMany(studentDocs);
  console.log(`✅ ${students.length} Students created`);

  // ── 4. CREATE 4 VENUES ────────────────────────────────────────────────────
  const venueDocs = [
    { name: 'Main Auditorium', city: 'Surat', cap: 500, coords: [72.8311, 21.1702], amenities: ['AC', 'Projector', 'WiFi', 'Stage'] },
    { name: 'Seminar Hall A', city: 'Surat', cap: 150, coords: [72.8321, 21.1712], amenities: ['AC', 'Projector', 'Whiteboard'] },
    { name: 'Open Air Theatre', city: 'Surat', cap: 300, coords: [72.8301, 21.1695], amenities: ['Stage', 'Sound System', 'Lighting'] },
    { name: 'Sports Complex', city: 'Surat', cap: 1000, coords: [72.8290, 21.1685], amenities: ['Changing Rooms', 'First Aid', 'Parking'] },
  ];

  const venues = await Venue.insertMany(
    venueDocs.map((v) => ({
      name: v.name,
      location: { type: 'Point', coordinates: v.coords },
      address: { street: 'Campus Road', city: v.city, state: 'Gujarat', zipCode: '395007' },
      capacity: v.cap,
      amenities: v.amenities,
      images: [],
    }))
  );
  console.log(`✅ ${venues.length} Venues created`);

  // ── 5. CREATE 8 EVENTS ────────────────────────────────────────────────────
  const eventData = [
    {
      title: 'Annual Web3 & AI Hackathon',
      description: '36-hour continuous hackathon on building decentralized AI agents and scalable web apps.',
      category: 'Academic',
      organizer: organizers[0]._id,
      venue: venues[0]._id,
      startDate: futureDays(7),
      endDate: futureDays(9),
      capacity: 100,
      registeredCount: 0,
      status: 'published',
      views: 145,
      budget: { total: 45000, breakdown: [{ item: 'Prizes', amount: 30000 }, { item: 'Food', amount: 15000 }] },
      tags: ['Hackathon', 'AI', 'Coding'],
    },
    {
      title: 'MongoDB Schema Design Masterclass',
      description: 'Hands-on workshop on indexing strategies, aggregation pipelines, and sharding architectures.',
      category: 'Workshop',
      organizer: organizers[0]._id,
      venue: venues[1]._id,
      startDate: futureDays(3),
      endDate: futureDays(4),
      capacity: 50,
      registeredCount: 0,
      status: 'published',
      views: 210,
      budget: { total: 15000, breakdown: [{ item: 'Speaker Fee', amount: 10000 }, { item: 'Certificates', amount: 5000 }] },
      tags: ['MongoDB', 'Database', 'Backend'],
    },
    {
      title: 'Campus Cultural Fest: Tarang',
      description: 'The flagship annual musical and cultural night featuring live bands and theater performances.',
      category: 'Cultural',
      organizer: organizers[1]._id,
      venue: venues[2]._id,
      startDate: futureDays(14),
      endDate: futureDays(15),
      capacity: 300,
      registeredCount: 0,
      status: 'published',
      views: 450,
      budget: { total: 120000, breakdown: [{ item: 'Sound & Stage', amount: 80000 }, { item: 'Lighting', amount: 40000 }] },
      tags: ['Music', 'Dance', 'Fest'],
    },
    {
      title: 'Inter-College Badminton Tournament',
      description: 'Annual championship for singles and doubles categories across college departments.',
      category: 'Sports',
      organizer: organizers[2]._id,
      venue: venues[3]._id,
      startDate: futureDays(10),
      endDate: futureDays(12),
      capacity: 80,
      registeredCount: 0,
      status: 'published',
      views: 90,
      budget: { total: 25000, breakdown: [{ item: 'Equipment & Trophies', amount: 25000 }] },
      tags: ['Sports', 'Badminton'],
    },
    {
      title: 'Cloud Computing & DevOps Symposium',
      description: 'Technical seminars on microservices, Kubernetes clusters, and automated CI/CD pipelines.',
      category: 'Seminar',
      organizer: organizers[0]._id,
      venue: venues[1]._id,
      startDate: futureDays(21),
      endDate: futureDays(22),
      capacity: 120,
      registeredCount: 0,
      status: 'published',
      views: 80,
      budget: { total: 30000, breakdown: [{ item: 'Hospitality', amount: 30000 }] },
      tags: ['Cloud', 'DevOps'],
    },
    {
      title: 'Winter Robotics Expo (Completed)',
      description: 'Showcase of autonomous rovers and drone automation projects.',
      category: 'Academic',
      organizer: organizers[0]._id,
      venue: venues[0]._id,
      startDate: pastDays(10),
      endDate: pastDays(8),
      capacity: 100,
      registeredCount: 10,
      status: 'completed',
      views: 320,
      avgRating: 4.8,
      ratingCount: 8,
      budget: { total: 50000, breakdown: [{ item: 'Components', amount: 50000 }] },
      tags: ['Robotics', 'Hardware'],
    },
    {
      title: 'Campus Photography Exhibition (Completed)',
      description: 'Gallery showcase of student landscape and street photography.',
      category: 'Cultural',
      organizer: organizers[1]._id,
      venue: venues[2]._id,
      startDate: pastDays(15),
      endDate: pastDays(13),
      capacity: 150,
      registeredCount: 8,
      status: 'completed',
      views: 180,
      avgRating: 4.9,
      ratingCount: 6,
      budget: { total: 20000, breakdown: [{ item: 'Printing & Frames', amount: 20000 }] },
      tags: ['Art', 'Photo'],
    },
    {
      title: 'Startup Pitch & Venture Fair (Pending Review)',
      description: 'Undergraduate student founder pitches before angel investors and incubator heads.',
      category: 'Social',
      organizer: organizers[0]._id,
      venue: venues[0]._id,
      startDate: futureDays(30),
      endDate: futureDays(31),
      capacity: 150,
      registeredCount: 0,
      status: 'pending',
      views: 20,
      budget: { total: 60000, breakdown: [{ item: 'Guest Honorariums', amount: 60000 }] },
      tags: ['Startup', 'Pitch'],
    }
  ];

  const events = await Event.insertMany(eventData);
  console.log(`✅ ${events.length} Events created`);

  // ── 6. CREATE REGISTRATIONS ───────────────────────────────────────────────
  const regDocs = [];

  // Register all 10 students into upcoming events
  students.forEach((student, sIdx) => {
    // Register into event 0 (Hackathon)
    regDocs.push({
      event: events[0]._id,
      student: student._id,
      status: 'registered',
      source: 'direct',
      createdAt: pastDays(2),
    });

    // Register into event 1 (MongoDB Workshop)
    if (sIdx < 7) {
      regDocs.push({
        event: events[1]._id,
        student: student._id,
        status: 'registered',
        source: 'direct',
        createdAt: pastDays(1),
      });
    }

    // Register into completed event 5 (Robotics Expo) with checked-in status
    regDocs.push({
      event: events[5]._id,
      student: student._id,
      status: 'checked-in',
      checkedInAt: pastDays(9),
      source: 'direct',
      createdAt: pastDays(12),
    });
  });

  const registrations = await Registration.insertMany(regDocs);

  // Update registeredCount on events
  await Event.findByIdAndUpdate(events[0]._id, { registeredCount: 10 });
  await Event.findByIdAndUpdate(events[1]._id, { registeredCount: 7 });
  await Event.findByIdAndUpdate(events[5]._id, { registeredCount: 10 });

  console.log(`✅ ${registrations.length} Registrations created`);

  // ── 7. CREATE FEEDBACKS ───────────────────────────────────────────────────
  const feedbackDocs = [
    {
      event: events[5]._id,
      student: students[0]._id,
      rating: 5,
      answers: { eventQuality: 5, organization: 5, venueSuitability: 5, contentRelevance: 5, overallValue: 5 },
      comment: 'Incredible robotics demos! The hands-on rover sessions were super educational.',
      sentiment: 'positive',
    },
    {
      event: events[5]._id,
      student: students[1]._id,
      rating: 5,
      answers: { eventQuality: 5, organization: 4, venueSuitability: 5, contentRelevance: 5, overallValue: 5 },
      comment: 'Very well structured. Would love an advanced session next semester.',
      sentiment: 'positive',
    },
    {
      event: events[5]._id,
      student: students[2]._id,
      rating: 4,
      answers: { eventQuality: 4, organization: 4, venueSuitability: 4, contentRelevance: 5, overallValue: 4 },
      comment: 'Great exposure to hardware concepts. Refreshments were nicely arranged.',
      sentiment: 'positive',
    },
    {
      event: events[5]._id,
      student: students[3]._id,
      rating: 5,
      answers: { eventQuality: 5, organization: 5, venueSuitability: 5, contentRelevance: 5, overallValue: 5 },
      comment: 'Excellent organizers and great mentors present.',
      sentiment: 'positive',
    }
  ];

  await Feedback.insertMany(feedbackDocs);
  console.log(`✅ ${feedbackDocs.length} Feedbacks created`);

  // ── 8. CREATE NOTIFICATIONS ───────────────────────────────────────────────
  const notifDocs = students.slice(0, 5).map(s => ({
    user: s._id,
    type: 'EVENT_REMINDER',
    title: 'Reminder: Web3 & AI Hackathon',
    message: 'Your registered event starts in 7 days at Main Auditorium.',
    isRead: false,
    isArchived: false,
    createdAt: new Date(),
  }));

  await Notification.insertMany(notifDocs);
  console.log(`✅ ${notifDocs.length} Notifications created`);

  // ── 9. CREATE PLATFORM FEEDBACKS ──────────────────────────────────────────
  await PlatformFeedback.insertMany([
    {
      user: students[0]._id,
      type: 'suggestion',
      title: 'Add Google Calendar export button',
      description: 'It would be great to add registered events directly to Google Calendar from the ticket pass modal.',
      status: 'planned',
    },
    {
      user: students[1]._id,
      type: 'bug',
      title: 'Dark mode contrast on venue filter',
      description: 'The dropdown text on venue select has low contrast in dark theme.',
      status: 'open',
    }
  ]);
  console.log('✅ 2 Platform Feedbacks created');

  console.log('\n============================================================');
  console.log('🎉 COMPACT SEED COMPLETE! Total: 14 Users, 8 Events, 4 Venues');
  console.log('============================================================');
  console.log('👤 ADMIN:      admin@campus.edu       / Demo@1234');
  console.log('🎪 ORGANIZER:  techclub@campus.edu    / Demo@1234');
  console.log('               cultural@campus.edu    / Demo@1234');
  console.log('               sports@campus.edu      / Demo@1234');
  console.log('🎓 STUDENTS:   student1@campus.edu to student10@campus.edu / Demo@1234');
  console.log('============================================================\n');

  await mongoose.disconnect();
}

seed().catch(console.error);
