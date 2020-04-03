require('dotenv').config()
require('@kth/reqvars').check()
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
  const sisImportFilePath = './enrollments.csv'
  const incompleteStudentsFilePath = './failed-students.csv'
  const writeHeaders = (filePath, headers) =>
    fs.writeFileSync(filePath, headers.join(',') + '\n')
  const writeContent = (filePath, content) =>
    fs.appendFileSync(filePath, content.join(',') + '\n')

  writeHeaders(sisImportFilePath, [
    'user_id',
    'role_id',
    'section_id',
    'status'
  ])
  writeHeaders(incompleteStudentsFilePath, ['section_id', 'ladok_uid'])

  const fromDate = new Date(process.env.FROM_DATE)
  const toDate = new Date(process.env.TO_DATE)
  for (
    const date = fromDate;
    date <= toDate;
    date.setDate(date.getDate() + 1)
  ) {
    const dateString = date.toISOString().split('T')[0]
    const {
      body: aktivitetstillfallenResponse
    } = await aktivitetstillfallenApi(
      `aktivitetstillfallen/students?fromDate=${dateString}&toDate=${dateString}`
    )
    const examinations = aktivitetstillfallenResponse.aktivitetstillfallen
    for (const examination of examinations) {
      // Eliminate duplicates.
      const courseCodes = examination.courseCodes.filter(
        (courseCode, index) =>
          examination.courseCodes.indexOf(courseCode) === index
      )
      // Sort course codes.
      courseCodes.sort()
      for (const student of examination.registeredStudents) {
        const baseSectionId = `${courseCodes[0]}_${examination.type}_${examination.date}`
        const fullSectionId = student.funka.length
          ? `${baseSectionId}_FUNKA`
          : baseSectionId
        if (!student.kthid) {
          writeContent(incompleteStudentsFilePath, [
            fullSectionId,
            student.ladokUID
          ])
        } else {
          writeContent(sisImportFilePath, [
            student.kthid,
            STUDENT_ROLE_ID,
            fullSectionId,
            'active'
          ])
        }
      }
    }
  }
  const { body: sisImportResponse } = await canvasApi.sendSis(
    '/accounts/1/sis_imports',
    sisImportFilePath
  )
  console.info('SIS Import response: ', sisImportResponse)
}

start()

// TODO: Try to fetch stats about how many aktivitetstillfallen have multiple courses
