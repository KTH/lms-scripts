require('dotenv').config()
const fs = require('fs')
const CanvasApi = require('@kth/canvas-api')

const canvasApi = CanvasApi(
  process.env.CANVAS_API_URL,
  process.env.CANVAS_API_TOKEN
)

const STUDENT_ROLE_ID = 3
// Note: Right now, using a prebaked json!
const exampleExaminations = require('./example-data.json')

async function start () {
  const filePath = './enrollments.csv'
  const writeHeaders = headers =>
    fs.writeFileSync(filePath, headers.join(',') + '\n')
  const writeContent = content =>
    fs.appendFileSync(filePath, content.join(',') + '\n')

  writeHeaders(['user_id', 'role_id', 'section_id', 'status'])

  // TODO: Insert code here for fetching data from the fancy new StudAdm API

  for (const examination of exampleExaminations) {
    // Eliminate duplicates
    const courseCodes = new Set(examination.courseCodes)
    for (const courseCode of courseCodes) {
      for (const student of examination.registeredStudents) {
        writeContent([
          student.kthid,
          STUDENT_ROLE_ID,
          `${courseCode}_${examination.type}_${examination.date}`,
          'active'
        ])
      }
    }
  }

  const { body } = await canvasApi.sendSis('/accounts/1/sis_imports', filePath)
  console.info('SIS Import response: ', body)
}

start()
