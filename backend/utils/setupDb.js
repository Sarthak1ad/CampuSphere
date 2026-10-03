/**
 * DB SETUP SCRIPT
 * ---------------
 * Applies $jsonSchema validators to MongoDB collections.
 * Run once: npm run setup-db
 *
 * MongoDB Concept: $jsonSchema Validator
 * MongoDB can enforce document structure at the DATABASE level using JSON Schema.
 * This is enforced by MongoDB's storage engine — even direct MongoDB shell inserts
 * that bypass Mongoose will be validated!
 *
 * This adds a second layer of validation on top of Mongoose schema validators.
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function setupDb() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  console.log('✅ Connected to MongoDB');

  // ── Apply JSON Schema Validator to 'events' collection ───────────────────
  // MongoDB Concept: collMod with validator
  // We use 'collMod' command to add a schema validator to an existing collection.
  // validationLevel: 'moderate' — validate on insert; on update only validate changed fields
  // validationAction: 'error' — reject documents that fail validation
  try {
    await db.command({
      collMod: 'events',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['title', 'description', 'category', 'organizer', 'venue', 'startDate', 'endDate', 'capacity', 'status'],
          properties: {
            title: {
              bsonType: 'string',
              minLength: 2,
              maxLength: 200,
              description: 'Event title is required and must be 2-200 characters',
            },
            description: {
              bsonType: 'string',
              minLength: 50,
              description: 'Description must be at least 50 characters',
            },
            category: {
              bsonType: 'string',
              enum: ['Academic', 'Cultural', 'Sports', 'Social', 'Workshop', 'Seminar'],
              description: 'Category must be one of the allowed values',
            },
            capacity: {
              bsonType: 'int',
              minimum: 1,
              description: 'Capacity must be a positive integer',
            },
            registeredCount: {
              bsonType: 'int',
              minimum: 0,
              description: 'registeredCount cannot be negative',
            },
            status: {
              bsonType: 'string',
              enum: ['draft', 'pending', 'published', 'rejected', 'cancelled', 'completed', 'archived'],
            },
            'budget.total': {
              bsonType: 'double',
              minimum: 0,
              description: 'Budget total must be non-negative',
            },
          },
        },
      },
      validationLevel: 'moderate',
      validationAction: 'error',
    });
    console.log('✅ Applied $jsonSchema validator to events collection');
  } catch (err) {
    if (err.codeName === 'NamespaceNotFound') {
      console.log('ℹ️  events collection does not exist yet (it will be created on first insert)');
    } else {
      console.error('❌ Failed to apply events validator:', err.message);
    }
  }

  // ── Apply JSON Schema Validator to 'registrations' collection ────────────
  try {
    await db.command({
      collMod: 'registrations',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['event', 'student', 'status', 'qrToken'],
          properties: {
            status: {
              bsonType: 'string',
              enum: ['registered', 'waitlisted', 'checked-in', 'cancelled', 'no-show'],
            },
            qrToken: {
              bsonType: 'string',
              description: 'QR token is required and must be a string',
            },
          },
        },
      },
      validationLevel: 'moderate',
      validationAction: 'error',
    });
    console.log('✅ Applied $jsonSchema validator to registrations collection');
  } catch (err) {
    if (err.codeName === 'NamespaceNotFound') {
      console.log('ℹ️  registrations collection does not exist yet');
    } else {
      console.error('❌ Failed to apply registrations validator:', err.message);
    }
  }

  // ── Create collections if they don't exist ────────────────────────────────
  const existingCollections = await db.listCollections().toArray();
  const existingNames = existingCollections.map(c => c.name);

  const collectionsToCreate = ['users', 'venues', 'events', 'registrations', 'feedbacks', 'notifications', 'platformfeedbacks', 'auditlogs'];

  for (const colName of collectionsToCreate) {
    if (!existingNames.includes(colName)) {
      await db.createCollection(colName);
      console.log(`✅ Created collection: ${colName}`);
    }
  }

  await mongoose.disconnect();
  console.log('✅ DB setup complete!');
  process.exit(0);
}

setupDb().catch((err) => {
  console.error('❌ DB setup failed:', err);
  process.exit(1);
});
