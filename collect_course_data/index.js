require('dotenv').config()
const transferToLadokData = require('./utils/transferToLadokData')
const CanvasApi = require('@kth/canvas-api')
const got = require('got')
const path = require('path')
const fs = require('fs')

const FOLDER_NAME = 'output'
// TODO: How should course code filtering work, in general?
const INVALID_COURSE_CODE_CHARACTERS_REGEX = /Sandbox|@|\s|-|_/
const SEMESTER_REGEX = /(HT|VT)\d\d/g
const KOPPS_LANG_TO_CANVAS_LANG = { Svenska: 'sv', Engelska: 'en-GB' }

// For creating an url to a desired course in Canvas
function getCourseURL (courseId) {
  return `https://kth.test.instructure.com/courses/${courseId}`
}

// For parsing the school name from an account name
function getSchoolName (accountName) {
  const splitAccountName = accountName.split(' ')
  return splitAccountName[0]
}

async function getKOPPSData (courseCode) {
  if (!courseCode || INVALID_COURSE_CODE_CHARACTERS_REGEX.test(courseCode)) {
    return { educationCycle: '', language: '' }
  }

  try {
    const response = await got(
      `${process.env.KOPPS_API_URL}/course/${courseCode}/detailedinformation`
    ).json()
    const educationCycle = response.course.educationalLevelCode
    const language = response.roundInfos[0].round.language // TODO: This might need fine tuning!
    return { educationCycle, language: KOPPS_LANG_TO_CANVAS_LANG[language] }
  } catch (e) {
    console.warn(
      `Something went wrong when calling the KOPPS for course ${courseCode}`
    )
    console.warn(e)
    return { educationCycle: '', language: '' }
  }
}

function getSubAccountType (accountName) {
  if (accountName.includes('Manually')) {
    return 'manual'
  } else if (accountName.includes('Imported')) {
    return 'imported'
  } else if (accountName.includes('Sandboxes')) {
    return 'sandbox'
  } else {
    return ''
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

async function isViewed (canvas, courseId) {
  try {
    const { body: students } = await canvas.get(
      `/courses/${courseId}/analytics/student_summaries`,
      {
        sort_column: 'page_views_descending'
      }
    )
    return students[0].page_views > 0
  } catch (e) {
    console.warn(
      `Something went wrong when fetching student summaries for course ${courseId}`
    )
    console.warn(e)
    return false
  }
}

function getSemester (sisId) {
  if (!sisId) {
    return ''
  }

  const semester = sisId.match(SEMESTER_REGEX)
  return semester ? semester[0] : ''
}

function getYear (dateString) {
  if (!dateString) {
    return ''
  }

  return new Date(dateString).getFullYear()
}

function getLicense (licenseString) {
  if (!licenseString) {
    return ''
  }

  if (licenseString === 'private') {
    return 'Private'
  } else if (licenseString === 'public_domain') {
    return 'Public Domain'
  } else if (licenseString.startsWith('cc_')) {
    return 'Creative Commons'
  } else {
    return ''
  }
}

function getVisibility (isPublic, isPublicToAuthUsers) {
  if (isPublic) {
    return 'Public'
  } else if (isPublicToAuthUsers) {
    return 'Institution'
  } else {
    return 'Course'
  }
}

// TODO: Using ; instead of , for now - should I?
async function start () {
  // Fetch id:s for all Canvas courses which have been exported
  const transferredCourses = await transferToLadokData.fetchTransferredCourses()

  // Start out creating folders, cleaning files et.c.
  if (!fs.existsSync(FOLDER_NAME)) {
    fs.mkdirSync('output')
  }
  const outputPath = path.resolve('./output', process.env.OUTPUT_DATA_FILE)
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath)
  }

  // Create a new file and add headers
  const courseDataHeaders = [
    'name',
    'course_code',
    'course_url',
    'school',
    'education_cycle',
    'sub-account',
    'number_of_teachers',
    'number_of_students',
    'published',
    'viewed',
    'semester',
    'start_date',
    'year',
    'license',
    'visibility',
    'language',
    'transferredToLadok'
  ]
  fs.appendFileSync(outputPath, `${courseDataHeaders.join(';')}\n`)

  const canvas = CanvasApi(
    process.env.CANVAS_API_URL,
    process.env.CANVAS_ACCESS_TOKEN
  )
  const courses = canvas.list('/accounts/1/courses', {
    include: ['account', 'total_students', 'teachers', 'concluded']
  })
  for await (const course of courses) {
    console.debug(`Processing course: ${course.name}`)

    const courseCode = course.course_code
    const { educationCycle, language } = await getKOPPSData(courseCode)

    const subAccount = getSubAccountType(course.account.name)

    const courseId = course.id
    const viewed = (await isViewed(canvas, courseId)).toString()

    const courseData = [
      course.name,
      courseCode,
      getCourseURL(courseId),
      getSchoolName(course.account.name),
      educationCycle,
      subAccount,
      course.teachers.length, // Note: (Teacher, Course Responsible, Examiner, Ext. teacher, Course admin).
      course.total_students, // Note: Active and invited "students" (Student, Re-reg student, Ext. student, PhD student, Manually added student, Admitted not registered student).
      isPublished(course.workflow_state),
      viewed,
      getSemester(course.sis_course_id),
      course.start_at, // Note: Somewhat speculative. If we can do a perfect mapping with KOPPS, the information from that source is likely better.
      getYear(course.start_at),
      getLicense(course.license),
      getVisibility(course.is_public, course.is_public_to_auth_users),
      language ? language : course.locale ? course.locale : 'sv', // Note: Defaulting locale to Swedish!
      transferredCourses.includes(courseId)
    ]

    fs.appendFileSync(outputPath, `${courseData.join(';')}\n`)
  }
}

start()
