require('dotenv').config()
const fs = require('fs')
const got = require('got')
const CanvasApi = require('@kth/canvas-api')

const canvasApi = CanvasApi(
  process.env.CANVAS_API_URL,
  process.env.CANVAS_API_TOKEN
)
const aktivitetstillfallenApi = got.extend({
  prefixUrl: process.env.AKTIVITETSTILLFALLEN_API_URL,
  responseType: 'json',
  headers: {
    canvas_api_token: process.env.AKTIVITETSTILLFALLEN_API_TOKEN
  }
})

const STUDENT_ROLE_ID = 3

async function start () {
  const filePath = './enrollments.csv'
  const writeHeaders = headers =>
    fs.writeFileSync(filePath, headers.join(',') + '\n')
  const writeContent = content =>
    fs.appendFileSync(filePath, content.join(',') + '\n')

  writeHeaders(['user_id', 'role_id', 'section_id', 'status'])

  const { body } = await aktivitetstillfallenApi(
    'aktivitetstillfallen/students?fromDate=2020-04-17&toDate=2020-04-17'
  )
  const examinations = body.aktivitetstillfallen
  for (const examination of examinations) {
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
