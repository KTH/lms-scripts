require('dotenv').config()

const fs = require('fs')
const got = require('got')
const inquirer = require('inquirer')

inquirer.registerPrompt('datetime', require('inquirer-datepicker-prompt'))

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

const EXAMINER_ROLE_ID = 10

async function start () {
  const sisImportFilePath = './enrollments.csv'

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

  const fromDate = await promptDate('Start date', new Date('2020-04-14'))
  const toDate = await promptDate('End date', new Date('2020-04-17'))

  for (let date = fromDate; date <= toDate; date.setDate(date.getDate() + 1)) {
    const dateString = date.toISOString().split('T')[0]
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
      console.log(`$`)

      if (courseCodes.length > 1) {
        console.log(`${examination.ladokUID}: has several course codes: ${courseCodes.join(',')}`)
      }

      // Sort course codes.
      courseCodes.sort()

      // Pick the first in alphabetical order
      const courseCode = courseCodes[0]

      // Kopps API
      const { body } = await got(`https://api.kth.se/api/kopps/v2/course/${courseCode}/detailedinformation`, {
        responseType: 'json'
      })

      for (const examiner of body.examiners) {
        const sectionId = `${courseCode}_${examination.type}_${examination.date}`
        writeContent(sisImportFilePath, [
          examiner.kthid,
          EXAMINER_ROLE_ID,
          sectionId,
          'active'
        ])
      }
    }
  }
}

start()
