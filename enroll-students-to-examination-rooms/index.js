require('dotenv').config()
require('@kth/reqvars').check()
const fs = require('fs')
const got = require('got')
const CanvasApi = require('@kth/canvas-api')
const inquirer = require('inquirer')
const { addDays, isAfter, format } = require('date-fns')

inquirer.registerPrompt('datetime', require('inquirer-datepicker-prompt'))

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

async function promptDate (message, initial) {
  const { examDate } = await inquirer.prompt([
    {
      type: 'datetime',
      format: ['yyyy', '-', 'mm', '-', 'dd' ],
      name: 'examDate',
      initial: initial || new Date('2020-03-10'),
      message
    }
  ])

  return examDate
}

function intervalArray (startDate, endDate) {
  const interval = []

  for (let date = startDate; !isAfter(date, endDate); date = addDays(date, 1)) {
    interval.push(date)
  }

  return interval
}

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

  const fromDate = await promptDate('Start date', new Date('2020-04-14'))
  const toDate = await promptDate('End date', new Date('2020-04-17'))

  for (const date of intervalArray(fromDate, toDate)) {
    const dateString = format(date, 'yyyy-MM-dd')
    console.log(`Fetching exams for date ${dateString}`)

    const {
      body: aktivitetstillfallenResponse
    } = await aktivitetstillfallenApi(
      `aktivitetstillfallen/students?fromDate=${dateString}&toDate=${dateString}`
    )
    const examinations = aktivitetstillfallenResponse.aktivitetstillfallen
    console.log(`Obtained ${examinations.length} examinations`)
    for (const examination of examinations) {
      // Eliminate duplicates.
      const courseCodes = Array.from(new Set(examination.courseCodes))

      if (courseCodes.length > 1) {
        console.log(`${examination.ladokUID}: has several course codes: ${courseCodes.join(',')}`)
      }

      // Sort course codes.
      courseCodes.sort()
      for (const student of examination.registeredStudents) {
        const baseSectionId = `${courseCodes[0]}_${examination.type}_${examination.date}`
        const fullSectionId = student.funka.length > 0
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
