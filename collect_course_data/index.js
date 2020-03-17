require('dotenv').config()
const transferToLadokData = require('./utils/transferToLadokData')
const CanvasApi = require('@kth/canvas-api')
const got = require('got')
const path = require('path')
const fs = require('fs')
const util = require('util')
const parseStringAsync = util.promisify(require('xml2js').parseString)

const FOLDER_NAME = 'output'
const NEW_SCHOOL_MAP = new Map([
  ['BIO', 'CBH'],
  ['CSC', 'EECS'],
  ['EES', 'EECS'],
  ['STH', 'CBH'],
  ['ICT', 'EECS'],
  ['CHE', 'CBH'],
  ['ECE', 'ITM'],
  ['UF', 'GVS'],
  ['Ω', 'OMEGA']
])

// For creating an url to a desired course in Canvas
function getCourseURL (courseId) {
  return `https://kth.instructure.com/courses/${courseId}`
}

// For parsing the school name from an account name
function getSchoolName (accountName) {
  const splitAccountName = accountName.split(' ')
  const newAccountName = NEW_SCHOOL_MAP.get(splitAccountName[0])
  return newAccountName ? newAccountName : splitAccountName[0]
}

function parseSisId (sisId) {
  if (!sisId) {
    console.warn('Current course has no SIS ID')

    return {
      courseCode: '',
      semester: '',
      year: '',
      roundId: ''
    }
  }
  const found = sisId.match(/(\w+)(HT|VT)(\d\d)(\w+)/)

  if (!found) {
    console.warn(`Wrong SIS ID format: ${sisId}`)

    return {
      courseCode: '',
      semester: '',
      year: '',
      roundId: ''
    }
  }

  return {
    courseCode: found[1],
    semester: found[2],
    year: found[3],
    roundId: found[4]
  }
}

function isPublished (state) {
  switch (state) {
    case 'unpublished':
      return 'false'
    case 'available':
      return 'true'
    case 'completed':
      return 'true'
    case 'deleted':
      return 'false'
    default:
      return ''
  }
}

async function getFiles (canvas, courseId) {
  return (
    await canvas
      .list(`/courses/${courseId}/files`, { 'only[]': 'names' })
      .toArray()
  ).length
}

async function getModuleData (canvas, courseId) {
  const modulesResponse = canvas.list(`/courses/${courseId}/modules`)

  let modules = 0
  for await (mod of modulesResponse) {
    if (mod.published) {
      modules++
    }
  }

  return { modules }
}

// TODO: Using ; instead of , for now - should I?
async function start () {
  // Start out creating folders, cleaning files et.c.
  if (!fs.existsSync(FOLDER_NAME)) {
    fs.mkdirSync('output')
  }
  const outputPath = path.resolve('./output', process.env.OUTPUT_DATA_FILE)
  if (fs.existsSync(outputPath) && !process.env.APPEND_FROM_ID) {
    fs.unlinkSync(outputPath)
  }

  if (!process.env.APPEND_FROM_ID) {
    // Create a new file and add headers
    const courseDataHeaders = [
      'canvas_id',
      'sis_id',
      'name',
      'course_code',
      'course_url',
      'school',
      'number_of_teachers',
      'number_of_students',
      'is_published',
      'files',
      'modules'
    ]
    fs.appendFileSync(outputPath, `${courseDataHeaders.join(';')}\n`)
  }
  const canvas = CanvasApi(
    process.env.CANVAS_API_URL,
    process.env.CANVAS_ACCESS_TOKEN
  )
  const courses = canvas.list('/accounts/1/courses', {
    per_page: 100,
    include: ['account', 'total_students', 'teachers', 'concluded']
  })
  for await (const course of courses) {
    const courseId = course.id
    if (courseId < process.env.APPEND_FROM_ID) {
      console.debug(`Skipping ${course.name} due to append mode.`)
      continue
    }

    const { courseCode, semester, year, roundId } = parseSisId(
      course.sis_course_id
    )
    console.log(`${courseCode}|${semester}|${year}|${roundId}`)
    if (semester !== 'VT' || year !== '20') {
      console.debug(`Skipping ${course.name} due to not being a VT20 course.`)
      continue
    }

    const courseAccountName = course.account.name

    const courseData = [
      courseId,
      course.sis_course_id,
      course.name,
      courseCode,
      getCourseURL(courseId),
      getSchoolName(courseAccountName),
      ,
      course.teachers.length, // Note: (Teacher, Course Responsible, Examiner, Ext. teacher, Course admin).
      course.total_students, // Note: Active and invited "students" (Student, Re-reg student, Ext. student, PhD student, Manually added student, Admitted not registered student).
      isPublished(course.workflow_state)
    ]

    // Step 2: gather component data
    const files = await getFiles(canvas, courseId)

    const { modules } = await getModuleData(canvas, courseId)

    const componentData = [files, modules]

    // Step 4: append data to file
    const outputData = courseData.concat(componentData)
    fs.appendFileSync(outputPath, `${outputData.join(';')}\n`)
  }
}

start()
