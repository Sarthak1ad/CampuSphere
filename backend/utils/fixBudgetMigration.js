const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');
  const collection = mongoose.connection.collection('events');
  const events = await collection.find({}).toArray();
  console.log(`Found ${events.length} events in collection`);

  let fixedCount = 0;
  for (const ev of events) {
    const update = {};
    let needsUpdate = false;

    if (typeof ev.budget === 'string') {
      try {
        update.budget = JSON.parse(ev.budget);
      } catch (e) {
        update.budget = { total: 0, breakdown: [] };
      }
      needsUpdate = true;
    }

    if (typeof ev.tags === 'string') {
      try {
        update.tags = JSON.parse(ev.tags);
      } catch (e) {
        update.tags = ev.tags.split(',').map(t => t.trim()).filter(Boolean);
      }
      needsUpdate = true;
    }

    if (needsUpdate) {
      console.log(`Fixing event "${ev.title}" (ID: ${ev._id})`);
      await collection.updateOne({ _id: ev._id }, { $set: update });
      fixedCount++;
    }
  }

  console.log(`Successfully migrated ${fixedCount} events with string fields.`);
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
