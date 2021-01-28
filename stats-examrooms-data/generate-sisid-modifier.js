require("dotenv").config();

const csv = require("fast-csv")
const path = require("path")
const fs = require('fs')
const Canvas = require("@kth/canvas-api")

const canvas = Canvas(process.env.CANVAS_API_URL, process.env.CANVAS_API_TOKEN)

async function fetchSection (sisId) {
  try {
    const course = await canvas.get(`sections/sis_section_id:${sisId}`)
      .then(r => r.body);

    return course;
  } catch (err) {
    return null
  }
}

async function getNewSisId (row) {
  const transformations = [
    // Format 1. AKT.<uid>.<date>
    { old: `AKT.${row.uid}.${row.date}`, new: `AKT.${row.uid}` },
    { old: `AKT.${row.uid}.${row.date}.FUNKA`, new: `AKT.${row.uid}.FUNKA` },
    // Format 2. AE1602_TENA_2020-04-16
    { old: `${row.activities.replace(" ", "_")}_${row.date}`, new: `AKT.${row.uid}` },
    { old: `${row.activities.replace(" ", "_")}_${row.date}_FUNKA`, new: `AKT.${row.uid}.FUNKA` },

    // Format 3. AKT.<uid> (no transformation needed)
    { old: `AKT.${row.uid}`, new: `AKT.${row.uid}` },
    { old: `AKT.${row.uid}.FUNKA`, new: `AKT.${row.uid}.FUNKA` },
  ]

  for (const transformation of transformations) {
    const section = await fetchSection(transformation.old)
    if (section) {
      return {
        oldId: section.sis_section_id,
        newId: transformation.new,
      }
    }
  }
}

async function transformRow (row, next) {
  const {oldId, newId} = await getNewSisId(row)

  if (newId) {
    // change_sis_id.csv format: https://canvas.instructure.com/doc/api/file.sis_csv.html
    console.log(oldId, newId)
    next(null, {
      old_id: oldId,
      new_id: newId,
      new_integration_id: "<delete>"
    })
  }
}

async function start () {
  const input = path.resolve(__dirname, "exam-list.csv")
  const output1 = path.resolve(__dirname, "change-sisid-sections.csv")

  const reader = fs.createReadStream(input)
  const writer1 = fs.createWriteStream(output1)

  reader
    .pipe(csv.parse({ headers: true }))
    .transform(transformRow)
    .pipe(csv.format({ headers: true }))
    .pipe(writer1)
    .on("error", () => {
      console.log("Wah")
    })
}

start()
