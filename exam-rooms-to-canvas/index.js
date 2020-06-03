require('dotenv').config()
require('colors')
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
  try {
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
  } catch (e) {
    console.error('An error occurred when calling akt api', e)
    process.exit()
  }
}

/** Fetches detailed information about a course from the Kopps API */
async function getDetailedCourseInfoWithoutCache (courseCode) {
  try {
    const { body } = await got(
      `${process.env.KOPPS_API_URL}/course/${courseCode}/detailedinformation`,
      {
        responseType: 'json'
      }
    )
    return body
  } catch (e) {
    console.error('An error occurred when calling kopps api', e)
    process.exit()
  }
}

const getDetailedCourseInfo = memoize(getDetailedCourseInfoWithoutCache)

function writeHeader (file) {
  fs.writeFileSync(file, HEADERS[file].join(',') + '\n')
}

function writeContent (file, content) {
  fs.appendFileSync(file, content.join(',') + '\n')
}

async function courses (courseSisId, courseName, subAccount, blueprintSisId) {
  // TODO: Decide if short_name and long_name should have different values.
  writeContent(COURSES_FILE, [
    courseSisId,
    courseName,
    courseName,
    subAccount,
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

  const { startDate, endDate } = await inquirer.prompt([
    {
      name: 'startDate',
      type: 'datetime',
      message: 'Initial date',
      format: ['yyyy', '-', 'mm', '-', 'dd'],
      initial: new Date('2020-06-02')
    },
    {
      name: 'endDate',
      type: 'datetime',
      message: 'End date',
      format: ['yyyy', '-', 'mm', '-', 'dd'],
      initial: new Date('2020-06-05')
    }
  ])

  const useBlueprint = true
  let blueprintSisId = 'exam_bp_2020_p4' // TODO: set a sis id here

  const { doZip } = await inquirer.prompt({
    name: 'doZip',
    type: 'confirm',
    message: 'Do you want to zip all the files?',
    default: true
  })

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

    console.log('Handling examinations for one day')
    for (const examination of examinations) {
      process.stdout.write('.')
      const courseCodes = []
      examination.aktiviteter.forEach(a =>
        courseCodes.push(...Array.from(new Set(a.courseCodes)))
      )

      const courseName =
        examination.aktiviteter
          .map(akt => `${akt.courseCodes.join(' & ')} ${akt.activityCode}`)
          .join(' & ') + `: ${examination.date}`

      // const courseName = `${courseCodesAndTypes.join('/')}: ${examination.date}`
      const courseSisId = `AKT.${examination.ladokUID}.${examination.date}`
      const defaultSectionSisId = courseSisId
      const funkaSectionSisId = `${courseSisId}.FUNKA`

      if (outputFiles.includes(COURSES_FILE)) {
        // Verify that this aktivitetstillfälle isn't shared between schools
        if (
          new Set(examination.aktiviteter.map(akt => akt.courseOwner)).size > 1
        ) {
          console.log(
            'More then one school owns this aktivitetstillfälle. Double check this line in the courses csv file before uploading it to Canvas!'
              .red
          )
          console.log(
            'aktivitetstillfälle: ',
            examination.ladokUID,
            examination.aktiviteter.map(
              akt => `${akt.activityCode}, ${akt.courseCodes.join(',')}`
            ),
            examination.aktiviteter.map(akt => akt.courseOwner)
          )
        }

        // Choose the first school. This has to be manually checked if an aktivitetstillfälle is shared between schools, which will be logged if that is the case.
        const subAccount = `${examination.aktiviteter[0].courseOwner} - Examinations`
        await courses(courseSisId, courseName, subAccount, blueprintSisId)
      }

      if (outputFiles.includes(SECTIONS_FILE)) {
        await sections(courseSisId, defaultSectionSisId, funkaSectionSisId)
      }

      if (outputFiles.includes(STUDENTS_FILE)) {
        // Students are per aktivitet/Modul. Let's flatten them to an array of all the students
        const students = []
        examination.aktiviteter.forEach(akt =>
          students.push(...akt.registeredStudents)
        )

        studentsEnrollments(students, defaultSectionSisId, funkaSectionSisId)
      }

      if (outputFiles.includes(TEACHERS_FILE)) {
        await teachersEnrollments(
          courseCodes,
          defaultSectionSisId,
          funkaSectionSisId
        )
      }
    }
    console.log('Done with one day')
  }

  if (doZip) {
    const zip = new JSZip()
    for (const file of outputFiles) {
      zip.file(file, fs.readFileSync(file))
    }
    zip
      .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
      .pipe(fs.createWriteStream(ZIP_FILE))
      .on('finish', function () {
        console.log(`${ZIP_FILE} written to disk`)
      })
  }
}

start().catch(e => console.error(e))
