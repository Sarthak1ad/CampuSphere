# 🎓 College Event Management System (MEAN Stack)
> **Advanced Database Management Systems (ADBMS) Capstone Project**  
> Built with **MongoDB Atlas, Express.js 4, Angular 18 (Standalone Components), and Node.js 20 LTS**.

---

## 🌟 Executive Summary & Project Overview

The **College Event Management System** is a production-grade, enterprise-ready full-stack web application developed for academic institutions to streamline campus events, registrations, capacity control, ticketing via QR codes, analytics, and student engagement. 

Designed specifically as an **ADBMS Showcase Project**, MongoDB is the core hero of the application, featuring:
- High-concurrency atomic operations (`$inc`, `findOneAndUpdate`) preventing race conditions and overbooking
- Automatic waitlist promotion logic wrapped in **MongoDB Transactions (`session.withTransaction`)**
- Advanced multi-stage **Aggregation Pipelines** (`$facet`, `$bucket`, `$lookup`, `$unwind`, `$group`, `$project`, `$dateToString`)
- Strict database-level validation using **`$jsonSchema`** validators
- Complex indexing strategies including **2dsphere geospatial**, text search, compound, unique, and **TTL auto-expiry indexes**
- Real-time **DB Lab Performance Screen** for live `explain("executionStats")` index benchmarks and interactive query execution

---

## 📂 Project Architecture & Directory Structure

```text
/college-event-system
├── README.md                               # Complete setup, ADBMS documentation & Viva Q&A
├── backend/
│   ├── config/
│   │   └── db.js                           # MongoDB Atlas connection & indexing bootstrap
│   ├── controllers/
│   │   ├── authController.js               # JWT auth & profile management
│   │   ├── eventController.js              # Event CRUD, geo-search, view tracking
│   │   ├── registrationController.js       # Atomic booking, transactions, QR generation
│   │   ├── venueController.js              # Venue management & 2dsphere geo-queries
│   │   ├── feedbackController.js           # Feedback & sentiment analysis calculation
│   │   ├── notificationController.js       # In-app notifications & TTL cleanup
│   │   ├── analyticsController.js          # Multi-stage aggregation pipelines for reports
│   │   ├── userController.js               # Admin user management & organizer verification
│   │   └── dbLabController.js             # Live MongoDB metrics, explain plans & concurrency tests
│   ├── middleware/
│   │   ├── auth.js                         # JWT verification & RBAC authorization
│   │   ├── errorHandler.js                 # Centralized error handler & Mongoose code mapper
│   │   └── upload.js                       # Multer + Sharp image optimization
│   ├── models/
│   │   ├── User.js                         # Embedded organizerProfile, pre-save bcrypt, virtuals
│   │   ├── Venue.js                        # GeoJSON Point, 2dsphere spatial index
│   │   ├── Event.js                        # Text index, compound indexes, embedded budget
│   │   ├── Registration.js                 # Unique compound index, QR token, status enum
│   │   ├── Feedback.js                     # 5-criterion answer subdocs, sentiment rating
│   │   ├── Notification.js                 # TTL index (30 days auto-purge)
│   │   ├── PlatformFeedback.js             # Bug reports & feature requests
│   │   └── AuditLog.js                     # System activity trail
│   ├── routes/                             # Express REST API route definitions
│   ├── services/
│   │   ├── emailService.js                 # Nodemailer with console/Ethereal fallback
│   │   └── cronService.js                  # node-cron 24h event reminders & auto-completion
│   ├── utils/
│   │   ├── asyncHandler.js                 # Async wrapper eliminating try-catch boilerplate
│   │   └── setupDb.js                      # DB-level $jsonSchema validation injector
│   ├── seed/
│   │   └── index.js                        # Idempotent seed script (100+ students, 40+ events)
│   ├── server.js                           # Express entry point with helmet, rate-limit, mongoSanitize
│   ├── postman_collection.json             # Complete API testing collection
│   └── .env.example                        # Environment variable template
└── frontend/                               # Modern Angular 18 Standalone Application
    ├── src/
    │   ├── app/
    │   │   ├── core/                       # Guards, interceptors, auth & api services
    │   │   ├── shared/                     # Navbar, sidebar, modals, pipes, directives
    │   │   ├── features/
    │   │   │   ├── auth/                   # Split-screen login & register with role selection
    │   │   │   ├── student/                # Event discovery, RSVP, QR Pass, Feedback, Bug Reports
    │   │   │   ├── organizer/              # Event management, QR Scanner, Attendee lists, Analytics
    │   │   │   ├── admin/                  # Verification, Event approvals, Venues, Aggregations
    │   │   │   └── db-lab/                 # Interactive ADBMS presentation dashboard
    │   │   └── app.routes.ts               # Standalone routing configuration
    │   └── styles.css                      # Custom Design System (Syne + DM Sans, #E05A1A palette)
```

---

## 🚀 Quick Start & Installation

### Prerequisites
- **Node.js**: v20.x LTS or higher
- **MongoDB**: MongoDB Atlas Cluster (or local replica set for MongoDB Transactions)
- **Angular CLI**: v18.x (`npm install -g @angular/cli`)

---

### Step 1: Backend Setup

```bash
cd backend
npm install
```

Create `.env` file inside `backend/`:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:4200
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/college_events?retryWrites=true&w=majority
JWT_SECRET=college_event_system_super_secret_jwt_key_2024_very_long_and_random
JWT_EXPIRES_IN=7d
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=no-reply@collegeevents.edu
```

#### Apply Database-Level `$jsonSchema` Validation:
```bash
npm run setup-db
```

#### Run Idempotent Seed Script (Generates 1 Admin, 5 Organizers, 110 Students, 8 Venues, 42 Events, 500+ Registrations):
```bash
npm run seed
```

#### Start Backend API Server:
```bash
npm run dev
```
> Server runs on `http://localhost:5000`.

---

### Step 2: Frontend Setup

```bash
cd ../frontend
npm install
ng serve
```
> Open browser at `http://localhost:4200`.

---

## 🔑 Demo Credentials

All test accounts use the password: **`Password123!`**

| Role | Email | Description |
| :--- | :--- | :--- |
| **Admin** | `admin@college.edu` | Master administrator (approvals, users, venues, DB Lab, full reports) |
| **Organizer** | `acm@college.edu` | ACM Student Chapter Lead (Tech events, workshops, hackathons) |
| **Organizer** | `cultural@college.edu` | Cultural Committee President (Fests, music, drama) |
| **Organizer** | `sports@college.edu` | Sports Council Head (Tournaments, athletics) |
| **Organizer** | `ieee@college.edu` | IEEE Student Branch Coordinator (Seminars, conferences) |
| **Organizer** | `ecell@college.edu` | E-Cell President (Startup pitches, entrepreneurship) |
| **Student** | `student1@college.edu` | Sample Student (Tech & AI enthusiast, registered for events) |
| **Student** | `student2@college.edu` | Sample Student (Cultural & Music enthusiast) |
| **Student** | `student3@college.edu` | Sample Student (Sports enthusiast) |

---

## 🧠 Deep-Dive: Advanced MongoDB Concepts Implemented

### 1. High-Concurrency Atomic Operations & Anti-Overbooking
To prevent race conditions during ticket booking where multiple students click simultaneously:
```javascript
// Atomically check capacity and increment in a single operation
const updatedEvent = await Event.findOneAndUpdate(
  { _id: eventId, registeredCount: { $lt: event.capacity } },
  { $inc: { registeredCount: 1 } },
  { new: true, session }
);

if (!updatedEvent) {
  // Capacity reached -> Atomically place on waitlist
  const waitlistEntry = await Registration.create([{
    event: eventId,
    student: studentId,
    status: 'waitlisted'
  }], { session });
}
```

### 2. ACID Multi-Document Transactions
When a student cancels a confirmed seat, the system atomically:
1. Marks the existing registration as `cancelled`
2. Decrements `registeredCount` on the event
3. Finds the oldest `waitlisted` student (`sort({ createdAt: 1 })`)
4. Promotes that student to `registered` and increments `registeredCount`
5. Dispatches notifications

All executed inside `session.withTransaction()` with graceful fallback for standalone instances.

### 3. Comprehensive Indexing Strategy
- **Unique Indexes**:
  - `User.email` (`{ email: 1 }`, unique, lowercase)
  - `Registration.{event, student}` (`{ event: 1, student: 1 }`, unique to prevent duplicate bookings)
  - `Feedback.{event, student}` (`{ event: 1, student: 1 }`, unique to enforce 1 review per attendee)
  - `Event.{organizer, title, startDate}` (prevents duplicate scheduling)
- **Compound Query Indexes**:
  - `Event.{category: 1, startDate: 1}` (filters category within date ranges)
  - `Event.{status: 1, startDate: 1}` (active event listings)
- **Text Search Index**:
  - `Event.{title: "text", description: "text", tags: "text"}` (full-text search scoring via `$text: { $search: query }`)
- **Geospatial Index (2dsphere)**:
  - `Venue.location` (`{ location: "2dsphere" }` supporting `$near`, `$maxDistance` in meters)
- **TTL (Time-To-Live) Index**:
  - `Notification.createdAt` (`{ expireAfterSeconds: 2592000 }` -> auto-deletes archived notifications after 30 days)

### 4. Database-Level `$jsonSchema` Validation
Enforced at the MongoDB engine layer via `collMod`:
- Enforces strict BSON types (`string`, `int`, `date`, `objectId`, `array`)
- Enforces min/max boundaries and enum constraints (e.g. valid categories, status values)
- Guarantees schema integrity even if direct database inserts bypass the Mongoose layer.

### 5. Multi-Stage Aggregation Pipelines

#### A. Category Breakdown & Revenue with `$facet`:
```javascript
Event.aggregate([
  { $match: { status: 'completed' } },
  {
    $facet: {
      byCategory: [
        { $group: { _id: '$category', totalEvents: { $sum: 1 }, totalSeats: { $sum: '$capacity' } } },
        { $sort: { totalEvents: -1 } }
      ],
      budgetAnalysis: [
        { $group: { _id: null, avgBudget: { $avg: '$budget.total' }, totalSpent: { $sum: '$budget.total' } } }
      ]
    }
  }
])
```

#### B. Attendance Rate and No-Show Bucket Analysis:
```javascript
Registration.aggregate([
  {
    $group: {
      _id: '$event',
      totalRegistered: { $sum: 1 },
      checkedIn: { $sum: { $cond: [{ $eq: ['$status', 'checked-in'] }, 1, 0] } },
      noShow: { $sum: { $cond: [{ $eq: ['$status', 'no-show'] }, 1, 0] } }
    }
  },
  {
    $project: {
      attendanceRate: { $multiply: [{ $divide: ['$checkedIn', '$totalRegistered'] }, 100] },
      noShowRate: { $multiply: [{ $divide: ['$noShow', '$totalRegistered'] }, 100] }
    }
  }
])
```

#### C. Personalized Student Recommendations:
Uses student's recorded interest tags + history of attended event categories:
```javascript
Event.aggregate([
  { $match: { status: 'published', startDate: { $gte: new Date() }, category: { $in: preferredCategories } } },
  { $lookup: { from: 'venues', localField: 'venue', foreignField: '_id', as: 'venueDoc' } },
  { $unwind: '$venueDoc' },
  { $sort: { avgRating: -1, startDate: 1 } },
  { $limit: 6 }
])
```

---

## 🔬 DB Lab Presentation Module

Located in the Admin dashboard under **DB Lab (`/admin/db-lab`)**:
1. **Live Collection Inspection**: Real-time document count, storage size, average document size, and active index definitions.
2. **Side-by-Side Index Performance Benchmark (`explain("executionStats")`)**:
   - Executes query **WITH INDEX** vs **WITHOUT INDEX** (`hint({ $natural: 1 })`)
   - Displays `docsExamined`, `executionTimeMillis`, and query strategy (`IXSCAN` vs `COLLSCAN`).
3. **Live Aggregation Runner**: Run 5 pre-built advanced pipelines with instant JSON view and visual stage breakdown.
4. **Concurrency Simulator**: Fires 20 simultaneous HTTP POST registration requests to a 5-seat event and confirms exactly 5 succeed as `registered` while 15 are placed on `waitlisted`.

---

## 🎤 10-Minute Presentation Script & Viva Q&A

### ⏱️ Time Breakdown:
- **0:00 - 2:00**: Project introduction, architectural overview, and problem statement.
- **2:00 - 4:30**: Live Demo (Student RSVP, QR Ticket Generation, Organizer QR Check-in, Admin Approvals).
- **4:30 - 7:30**: **DB Lab & ADBMS Highlights** (Explain plans, $jsonSchema, Atomic updates, Aggregations).
- **7:30 - 10:00**: Viva Q&A with examiner.

---

### ❓ Top 10 Viva Questions & Detailed Answers

#### 1. Why did you choose MongoDB over a relational database (RDBMS) for this project?
> **Answer:** Events have polymorphic attributes (dynamic budget breakdowns, flexible attendee answers, varying venue amenities, and GeoJSON coordinates). MongoDB's document model allows rich nested data (`budget.breakdown`, `organizerProfile`) without complex multi-table joins. Additionally, MongoDB provides native 2dsphere geospatial queries, text search, high-write throughput for real-time registrations, and versatile aggregation pipelines.

#### 2. How did you prevent race conditions and overbooking during concurrent registrations?
> **Answer:** We avoid read-then-write anti-patterns in application code. Instead, we use MongoDB's atomic `findOneAndUpdate` with a conditional filter `{ _id: eventId, registeredCount: { $lt: capacity } }` combined with the `$inc: { registeredCount: 1 }` operator. Because single-document writes in MongoDB are atomic, only registrations that execute before capacity is reached will update the counter. Subsequent requests fail the filter condition and are safely diverted to the waitlist.

#### 3. How does MongoDB handle transactions, and when did you use them?
> **Answer:** Since MongoDB 4.0, multi-document ACID transactions are supported across replica sets using sessions (`session.withTransaction()`). We used them in waitlist promotion and registration cancellations where multiple documents across `registrations`, `events`, and `notifications` collections must all succeed or all rollback together.

#### 4. What is the difference between `COLLSCAN` and `IXSCAN` in an explain plan?
> **Answer:** `COLLSCAN` (Collection Scan) means MongoDB scanned every document in the collection from disk, which is O(N) and slow. `IXSCAN` (Index Scan) means MongoDB traversed a B-Tree index structure in O(log N) time and only fetched the matching index keys, drastically reducing `docsExamined` and `executionTimeMillis`.

#### 5. How does a 2dsphere index work in MongoDB?
> **Answer:** A `2dsphere` index indexes geometries on an Earth-like sphere using standard WGS84 coordinate pairs `[longitude, latitude]`. It supports spherical queries such as `$near` and `$geoWithin` with distance calculated accurately in meters using `$maxDistance`.

#### 6. What is the purpose of `$jsonSchema` validation in MongoDB?
> **Answer:** While Mongoose provides application-level validation, `$jsonSchema` enforces data integrity at the database server level. Even if an admin runs direct scripts or external services connect without Mongoose, the database rejects documents that violate data types, required fields, or regex patterns.

#### 7. How does the TTL (Time-To-Live) index function?
> **Answer:** A TTL index on a Date field (e.g. `createdAt` with `expireAfterSeconds: 2592000`) instructs MongoDB's background cleanup thread (which runs once every 60 seconds) to automatically delete documents whose timestamp has expired, eliminating manual cron purge scripts.

#### 8. How did you structure your aggregation pipelines for reports?
> **Answer:** We leveraged multi-stage pipelines: `$match` filters active documents early to utilize indexes; `$lookup` performs left-outer joins; `$unwind` deconstructs arrays; `$group` computes aggregates like `$avg`, `$sum`, and `$count`; `$facet` executes multi-faceted aggregations in parallel; and `$project` shapes the final response.

#### 9. What is the difference between embedding and referencing in your data models?
> **Answer:** We **embedded** data that is always accessed together and has 1:1 or 1:bounded-few relationships, such as `organizerProfile` in `User`, and `budget.breakdown` in `Event`. We **referenced** (using `ObjectId` with `ref`) entities with 1:many or many:many relationships that grow unboundedly, such as `Event.organizer -> User`, `Event.venue -> Venue`, and `Registration.student -> User`.

#### 10. How does your system handle soft deletes?
> **Answer:** Instead of hard-deleting records which destroys historical analytics and referential integrity, we set `isArchived: true` or `status: 'archived'`. Query helper methods and default filters `{ isArchived: { $ne: true } }` exclude them from active user listings while preserving audit trails and analytics.

---

## 📄 License & Academic Attribution
Developed as an ADBMS Capstone Project. Educational use and academic evaluation permitted.
