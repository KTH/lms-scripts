require('dotenv').config();
const { MongoClient } = require("mongodb");
const fs = require('fs')

// Replace the uri string with your MongoDB deployment's connection string.
const client = new MongoClient(process.env.CONNECTION_STRING);

const m = new Map()

async function run() {
  try {
    const outputPath = './output.csv'
    const headers = [
      'date',
      'course',
      'user'
    ]

    fs.writeFileSync(outputPath, `${headers.join(';')}\n`)
    await client.connect();

    const database = client.db('lms-export-to-ladok-logs');
    const collection = database.collection('reports');

    // Old format
    const r1 = collection.find({ transfer_timestamp: { $exists: true }})

    // New format
    const r2 = collection.find({ timestamp: { $exists: true }})

    await r1.forEach(r => {
      const out = [
        new Date(r.transfer_timestamp).toISOString(),
        r.from_course_id,
        r.user_canvas_id,
      ]

      fs.appendFileSync(outputPath, `${out.join(';')}\n`)
    })

    await r2.forEach(r => {
      try {
        const out = [
          new Date(r.timestamp).toISOString(),
          r.course?.id || r.course,
          r.user?.id || r.requester?.userId,
        ]

        fs.appendFileSync(outputPath, `${out.join(';')}\n`)
      } catch (err) {
        console.log(r)
      }
    })
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
