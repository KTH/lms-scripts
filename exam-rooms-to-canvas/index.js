require('dotenv').config()

const fs = require('fs')
const got = require('got')
const memoize = require('memoizee')
const JSZip = require('jszip')
const inquirer = require('inquirer')
inquirer.registerPrompt('datetime', require('inquirer-datepicker-prompt'))

const EXAMINER_ROLE_ID = 10
const STUDENT_ROLE_ID = 3

const COURSES_FILE = 'courses-examinations.csv'
const SECTIONS_FILE = 'sections-examinations.csv'
const STUDENTS_FILE = 'enrollments-students.csv'
const TEACHERS_FILE = 'enrollments-examiners.csv'
const MISSING_STUDENTS_FILE = 'students-without-kthid.csv'
const ZIP_FILE = 'examinations-to-canvas.zip'

const HEADERS = {
  [COURSES_FILE]: [
    'course_id',
    'short_name',
    'long_name',
    'account_id',
    'status',
    'blueprint_course_id'
  ],

  [SECTIONS_FILE]: ['course_id', 'section_id', '"name"', 'status'],

  [STUDENTS_FILE]: [
    'user_id',
    'role_id',
    'section_id',
    'status',
    'limit_section_privileges'
  ],

  [TEACHERS_FILE]: ['user_id', 'role_id', 'section_id', 'status'],

  [MISSING_STUDENTS_FILE]: ['section_id', 'ladok_uid']
}

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

/** Fetches detailed information about a course from the Kopps API */
async function getDetailedCourseInfoWithoutCache (courseCode) {
  const { body } = await got(
    `${process.env.KOPPS_API_URL}/course/${courseCode}/detailedinformation`,
    {
      responseType: 'json'
    }
  )
  return body
}

const getDetailedCourseInfo = memoize(getDetailedCourseInfoWithoutCache)

function writeHeader (file) {
  fs.writeFileSync(file, HEADERS[file].join(',') + '\n')
}

function writeContent (file, content) {
  fs.appendFileSync(file, content.join(',') + '\n')
}

async function courses (courseSisId, courseName, blueprintSisId) {
  // TODO: Decide if short_name and long_name should have different values.
  writeContent(COURSES_FILE, [
    courseSisId,
    courseName,
    courseName,
    `Examinations`,
    'active',
    blueprintSisId
  ])
}

function sections (courseSisId, defaultSectionSisId, funkaSectionSisId) {
  writeContent(SECTIONS_FILE, [
    courseSisId,
    defaultSectionSisId,
    'Section 1',
    'active'
  ])

  writeContent(SECTIONS_FILE, [
    courseSisId,
    funkaSectionSisId,
    'Section 2',
    'active'
  ])
}

function studentsEnrollments (
  students,
  defaultSectionSisId,
  funkaSectionSisId
) {
  for (const student of students) {
    const sectionId =
      student.funka.length > 0 ? funkaSectionSisId : defaultSectionSisId

    if (!student.kthid) {
      writeContent(MISSING_STUDENTS_FILE, [sectionId, student.ladokUID])
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

async function teachersEnrollments (
  courseCodes,
  defaultSectionSisId,
  funkaSectionSisId
) {
  for (const courseCode of courseCodes) {
    const body = await getDetailedCourseInfo(courseCode)

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
      { name: 'Course rooms', value: COURSES_FILE },
      { name: 'Sections', value: SECTIONS_FILE },
      { name: 'Students enrollments', value: STUDENTS_FILE },
      { name: 'Teachers (incl. examiners) enrollments', value: TEACHERS_FILE }
    ],
    default: []
  })

  const { doZip } = await inquirer.prompt({
    name: 'doZip',
    type: 'confirm',
    message: 'Do you want to zip all the files?',
    default: true
  })

  const { startDate, endDate } = await inquirer.prompt([
    {
      name: 'startDate',
      type: 'datetime',
      message: 'Initial date',
      format: ['yyyy', '-', 'mm', '-', 'dd'],
      initial: new Date('2020-04-14')
    },
    {
      name: 'endDate',
      type: 'datetime',
      message: 'End date',
      format: ['yyyy', '-', 'mm', '-', 'dd'],
      initial: new Date('2020-04-17')
    }
  ])

  const { useBlueprint } = await inquirer.prompt({
    name: 'useBlueprint',
    type: 'confirm',
    message: 'Do you want to use a Blueprint Course?',
    default: true
  })

  let blueprintSisId = ''
  if (useBlueprint) {
    blueprintSisId = (
      await inquirer.prompt({
        name: 'blueprintSisId',
        type: 'input',
        message: 'Enter Blueprint Course SIS ID!'
      })
    ).blueprintSisId
  }

  for (const file of outputFiles) {
    writeHeader(file)
    if (file === STUDENTS_FILE) {
      writeHeader(MISSING_STUDENTS_FILE)
    }
  }

  for (
    let date = startDate;
    date <= endDate; // eslint-disable-line
    date.setDate(date.getDate() + 1)
  ) {
    const dateString = date.toISOString().split('T')[0]
    console.log(`Fetching exams for date ${dateString}`)

    const examinations = await listExaminations(baseUrl, token, dateString)
    console.log(`Exams for date ${dateString}: ${examinations.length} found`)

    for (const examination of examinations) {
      const courseCodesAndTypes = Array.from(
        new Set(
          examination.courseCodes.map(
            (courseCode, index) =>
              `${courseCode.toUpperCase()} ${examination.type[
                index
              ].toUpperCase()}`
          )
        )
      )

      if (courseCodesAndTypes.length > 1) {
        console.log(
          `${
            examination.ladokUID
          }: has several course codes/types: ${courseCodesAndTypes.join(',')}`
        )
      }

      courseCodesAndTypes.sort()
      const courseName = `${courseCodesAndTypes.join('/')}: ${examination.date}`
      const courseSisId = `AKT.${examination.ladokUID}.${examination.date}`
      const defaultSectionSisId = courseSisId
      const funkaSectionSisId = `${courseSisId}.FUNKA`

      console.log(`Creating course and sections for ${courseName}`)
      if (outputFiles.includes(COURSES_FILE)) {
        await courses(courseSisId, courseName, blueprintSisId)
      }

      if (outputFiles.includes(SECTIONS_FILE)) {
        await sections(courseSisId, defaultSectionSisId, funkaSectionSisId)
      }

      console.log(`Enrolling people in ${defaultSectionSisId}...`)

      if (outputFiles.includes(STUDENTS_FILE)) {
        studentsEnrollments(
          examination.registeredStudents,
          defaultSectionSisId,
          funkaSectionSisId
        )
      }

      if (outputFiles.includes(TEACHERS_FILE)) {
        await teachersEnrollments(
          courseCodesAndTypes.map(codeAndType => codeAndType.split(' ')[0]),
          defaultSectionSisId,
          funkaSectionSisId
        )
      }
    }
  }

  if (doZip) {
    const zip = new JSZip()
    for (const file of outputFiles) {
      zip.file(file, fs.readFileSync(file))
    }
    // TODO: Do we want to promisify this?
    zip
      .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
      .pipe(fs.createWriteStream(ZIP_FILE))
      .on('finish', function () {
        console.log(`${ZIP_FILE} written to disk`)
      })
  }
}

start()
