require("dotenv").config();

const csv = require("fast-csv")
const path = require("path")
const fs = require('fs')
const Canvas = require("@kth/canvas-api")
const {getExaminations} = require("./utils")

const canvas = Canvas(process.env.CANVAS_API_URL, process.env.CANVAS_API_TOKEN)

async function * getTeachers (examinations) {
  for await (const exam of examinations) {
    const sisId = `AKT.${exam.uid}`
    console.log(`Getting teachers for "${sisId}"`)
    const enrollments = canvas.list(`courses/sis_course_id:${sisId}/enrollments`, {
      role_id: [
        4, // teacher
        10, // examiner
        9, // course responsible
        5, // TA
       ]
    })

    for await (const enrollment of enrollments) {
      yield {
        canvas_id: enrollment.user.id,
        kthid: enrollment.user.sis_user_id,
        name: enrollment.user.name,
        email1: `${enrollment.user.sis_user_id}@kth.se`,
        email2: enrollment.user.login_id
      }
    }
  }
}

async function writeToFile (iterable, path) {
  const writer = fs.createWriteStream(path)
  const stream = csv.format({ headers: true })
  stream.pipe(writer)


  for await (const object of iterable) {
    stream.write(object)
  }
  stream.end()
}

async function start () {
  const start = "2021-02-01"
  const end = "2021-02-28"

  console.log(`This script fetches all teachers in Canvas examinationrooms between ${start} and ${end}`)
  console.log("and creates a teachers-in-canvas-examrooms.csv file with them")

  const output = path.resolve(__dirname, "teachers-in-canvas-examrooms.csv")

  const examinations = getExaminations(start, end)
  const teachers = getTeachers(examinations)
  await writeToFile(teachers, output)

}

start()
