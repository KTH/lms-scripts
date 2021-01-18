require("dotenv").config();

const csv = require("fast-csv")
const path = require("path")
const fs = require('fs')
const Canvas = require("@kth/canvas-api")

const canvas = Canvas(process.env.CANVAS_API_URL, process.env.CANVAS_API_TOKEN)

async function fetchRoom (sisId) {
  try {
    const course = await canvas.get(`courses/sis_course_id:${sisId}`)
      .then(r => r.body);

    return course;
  } catch (err) {
    return null
  }
}

async function transformRow (row, next) {
  const sis1 = `AKT.${row.uid}`
  const sis2 = `AKT.${row.uid}.${row.date}`
  const sis3 = `${row.activities.replace(" ", "_")}_${row.date}`;

  const room = (await fetchRoom(sis1)) || (await fetchRoom(sis2)) || (await fetchRoom(sis3))


  if (room === null) {
    console.log(null)
    next(null)
  } else {
    console.log(room.id, room.workflow_state);
    next(null, {
      ...row,
      canvas_id: room.id,
      published: room.workflow_state === "available" || room.workflow_state === "completed"
    })
  }
}

async function start () {
  const input = path.resolve(__dirname, "exam-list-1.csv")
  const output = path.resolve(__dirname, "final-list.csv")

  const reader = fs.createReadStream(input)
  const writer = fs.createWriteStream(output)

  reader
    .pipe(csv.parse({ headers: true }))
    .transform(transformRow)
    .pipe(csv.format({ headers: true }))
    .pipe(writer)
    .on("error", () => {
      console.log("Wah")
    })
}

start()
