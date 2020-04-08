require('dotenv').config()

const fs = require('fs')
const got = require('got')
const inquirer = require('inquirer')
inquirer.registerPrompt('datetime', require('inquirer-datepicker-prompt'))

const EXAMINER_ROLE_ID = 10
const STUDENT_ROLE_ID = 3

const STUDENTS_FILE = 'enrollments-students.csv'
const TEACHERS_FILE = 'enrollments-examiners.csv'
const MISSING_STUDENTS_FILE = 'students-without-kthid.csv'

/* Not implemented
const SECTIONS_FILE = 'sections.csv'
const COURSES_FILE = 'courses.csv'
*/

/** Fetches all examination rounds from the aktivitetstillfällen API */
async function listExaminations (baseUrl, token, date) {
  const { body } = await got(
    `${baseUrl}/aktivitetstillfallen/students?fromDate=${date}&toDate=${date}`,
    {
      responseType: 'json',
      headers: {
        canvas_api_token: token
      }
    }
  )

  return body.aktivitetstillfallen
}

function writeHeader (file) {
  const headers = {
    [STUDENTS_FILE]: [
      'user_id',
      'role_id',
      'section_id',
      'status',
      'limit_section_privileges'
    ],

    [TEACHERS_FILE]: [
      'user_id',
      'role_id',
      'section_id',
      'status'
    ],

    [MISSING_STUDENTS_FILE]: [
      'section_id',
      'ladok_uid'
    ]
  }

  fs.writeFileSync(
    file,
    headers[file].join(',') + '\n'
  )
}

function writeContent (file, content) {
  fs.appendFileSync(file, content.join(',') + '\n')
}

function studentsEnrollments (students, defaultSectionSisId, funkaSectionSisId) {
  for (const student of students) {
    const sectionId = student.funka.length > 0 ? funkaSectionSisId : defaultSectionSisId

    if (!student.kthid) {
      writeContent(MISSING_STUDENTS_FILE, [
        sectionId,
        student.ladokUID
      ])
    } else {
      writeContent(STUDENTS_FILE, [
        student.kthid,
        STUDENT_ROLE_ID,
        sectionId,
        'active',
        'true'
      ])
    }
  }
}

async function teachersEnrollments (courseCodes, defaultSectionSisId, funkaSectionSisId) {
  for (const courseCode of courseCodes) {
    const { body } = await got(`https://api.kth.se/api/kopps/v2/course/${courseCode}/detailedinformation`, {
      responseType: 'json'
    })

    for (const examiner of body.examiners) {
      writeContent(TEACHERS_FILE, [
        examiner.kthid,
        EXAMINER_ROLE_ID,
        defaultSectionSisId,
        'active'
      ])
      writeContent(TEACHERS_FILE, [
        examiner.kthid,
        EXAMINER_ROLE_ID,
        funkaSectionSisId,
        'active'
      ])
    }
  }
}

async function start () {
  const baseUrl = process.env.AKTIVITETSTILLFALLEN_API_URL
  const token = process.env.AKTIVITETSTILLFALLEN_API_TOKEN

  const { outputFiles } = await inquirer.prompt({
    name: 'outputFiles',
    type: 'checkbox',
    message: 'Which files do you want to generate?',
    choices: [
      { name: 'Students enrollments', value: STUDENTS_FILE },
      { name: 'Teachers (incl. examiners) enrollments', value: TEACHERS_FILE },

      /* Not implemented
      { name: '(coming in a future) Course rooms', value: COURSES_FILE, disabled: true },
      { name: '(coming in a future) Sections', value: SECTIONS_FILE, disabled: true }
      */
    ],
    default: []
  })

  const { startDate, endDate } = await inquirer.prompt([
    {
      type: 'datetime',
      format: ['yyyy', '-', 'mm', '-', 'dd' ],
      name: 'startDate',
      initial: new Date('2020-04-14'),
      message: 'Initial date'
    },
    {
      type: 'datetime',
      format: ['yyyy', '-', 'mm', '-', 'dd' ],
      name: 'endDate',
      initial: new Date('2020-04-17'),
      message: 'End date'
    }
  ])

  for (const file of outputFiles) {
    writeHeader(file)
    writeHeader(MISSING_STUDENTS_FILE)
  }

  for (let date = startDate; date <= endDate; date.setDate(date.getDate() + 1)) {
    const dateString = date.toISOString().split('T')[0]
    console.log(`Fetching exams for date ${dateString}`)

    const examinations = await listExaminations(baseUrl, token, dateString)
    console.log(`Exams for date ${dateString}: ${examinations.length} found`)

    for (const examination of examinations) {
      const courseCodes = Array.from(
        new Set(examination.courseCodes.map(courseCode =>
          courseCode.toUpperCase()
        ))
      )

      if (courseCodes.length > 1) {
        console.log(`${examination.ladokUID}: has several course codes: ${courseCodes.join(',')}`)
      }

      // All course rooms will be in one "examination room", the first in
      // alphabetical order
      courseCodes.sort()
      const examinationRoomCode = courseCodes[0]
      const defaultSectionSisId = `${examinationRoomCode}_${examination.type}_${examination.date}`
      const funkaSectionSisId = `${examinationRoomCode}_${examination.type}_${examination.date}_FUNKA`

      console.log(`Enrolling people in ${defaultSectionSisId}...`)

      if (outputFiles.includes(STUDENTS_FILE)) {
        studentsEnrollments(examination.registeredStudents, defaultSectionSisId, funkaSectionSisId)
      }

      if (outputFiles.includes(TEACHERS_FILE)) {
        teachersEnrollments(courseCodes, defaultSectionSisId, funkaSectionSisId)
      }
    }
  }
}

start()
