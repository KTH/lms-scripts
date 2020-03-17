const { MongoClient } = require('mongodb')

async function fetchTransferredCourses () {
  const client = await MongoClient.connect(
    process.env.MONGODB_CONNECTION_STRING,
    { useUnifiedTopology: true }
  )
  const db = client.db(process.env.MONGODB_DATABASE_NAME)
  const collection = db.collection('reports')
  const docs = await collection.find({}).toArray()
  const transferredCourses = [...new Set(docs.map(doc => doc.from_course_id))]
  client.close()
  return transferredCourses
}

module.exports = {
  fetchTransferredCourses
}
