require("dotenv").config();
const got = require("got")
const Canvas = require("@kth/canvas-api")
const csv = require('fast-csv')
const path = require("path")
const fs = require('fs')

async function getActivities (date) {
  console.log(`Getting activities from ${date}`)
  const { body } = await got(
    `${process.env.AKTIVITETSTILLFALLEN_API_URL}/aktivitetstillfallen/students?fromDate=${date}&toDate=${date}`,
    {
      responseType: 'json',
      headers: {
        canvas_api_token: process.env.AKTIVITETSTILLFALLEN_API_TOKEN
      }
    }
  )

  return body.aktivitetstillfallen.map(akt => ({
    id: akt.ladokUID,
    date: akt.date,
  }))
}

async function start () {
  const startDate = new Date("2021-01-07T00:00:00Z")
  const endDate = new Date("2021-01-15T23:59:59Z")

  const canvas = Canvas(process.env.CANVAS_API_URL, process.env.CANVAS_API_TOKEN)

  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const dateString = date.toISOString().split('T')[0]
    const activities = await getActivities(dateString)
    console.log(`Activities for ${dateString}: ${activities.length}`)

    const filePath = path.resolve(__dirname, "enrollments.csv")
    const writer1 = fs.createWriteStream(filePath)
    const stream1 = csv.format({ headers: true })
    stream1.pipe(writer1)

    for (const activity of activities) {
      const sisID = `AKT.${activity.id}`
      console.log(`Fetching enrollments for ${sisID}`)
      const enrollments = canvas.list(`/courses/sis_course_id:${sisID}/enrollments`)

      for await (const enrollment of enrollments) {
        stream1.write({
          name: enrollment.user.name,
          activity: sisID,
          role: enrollment.type,
          mail1: `${enrollment.sis_user_id}@kth.se`,
          mail2: enrollment.user.login_id
        })
      }
    }
    stream1.end()
    await new Promise((resolve, reject) => {
      writer1.on('error', reject)
      writer1.on('finish', resolve)
    })
  }
}

start()
