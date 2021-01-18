require('dotenv').config()
// const transferToLadokData = require('./utils/transferToLadokData')
const CanvasApi = require('@kth/canvas-api')
const got = require('got')
const path = require('path')
const fs = require('fs')
const util = require('util')
const parseStringAsync = util.promisify(require('xml2js').parseString)

const FOLDER_NAME = 'output'
// TODO: How should course code filtering work, in general?
const INVALID_COURSE_CODE_CHARACTERS_REGEX = /Sandbox|@|\s|-|_/
const REDIRECT_URL_PATTERN = /https:\/\/www.edu-apps.org\/redirect/
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
const SEMESTER_TO_NUMBER = new Map([
  ['VT', 1],
  ['HT', 2]
])

// For creating an url to a desired course in Canvas
function getCourseURL (courseId) {
  return `https://kth.test.instructure.com/courses/${courseId}`
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

// Note: Using KOPPS v1 since it seems to be the place to get all the needed info.
async function getKOPPSData (courseCode, semester, year, roundId) {
  const periods = []
  if (!courseCode || INVALID_COURSE_CODE_CHARACTERS_REGEX.test(courseCode)) {
    return { educationCycle: '', language: '', periods }
  }

  try {
    const courseResponse = await got(
      `${process.env.KOPPS_API_V1_URL}/course/${courseCode}`
    )
    const courseResponseObject = await parseStringAsync(courseResponse.body)
    const educationCycle = courseResponseObject.course.educationalLevelCode[0]._

    const roundResponse = await got(
      `${
        process.env.KOPPS_API_V1_URL
      }/course/${courseCode}/round/20${year}:${SEMESTER_TO_NUMBER.get(
        semester
      )}/${roundId}`
    )
    const roundResponseObject = await parseStringAsync(roundResponse.body)
    const language = roundResponseObject.courseRound.tutoringLanguage[1]._

    for (const p of roundResponseObject.courseRound.periods[0].period) {
      periods.push(p.$.number)
    }
    return { educationCycle, language, periods }
  } catch (e) {
    // Note: Enable some extra logging for debugging!
    /*console.warn(
      `Something went wrong when calling the KOPPS for course ${courseCode}`
    )
    console.warn(e)*/
    return { educationCycle: '', language: '', periods }
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

async function getSectionData (canvas, courseId) {
  const sectionsResponse = await canvas
    .list(`/courses/${courseId}/sections`)
    .toArray()

  const sections = sectionsResponse.length

  const crossListedSections = sectionsResponse.filter(
    section => section.nonxlist_course_id
  ).length

  const sectionIds = sectionsResponse
    .filter(section => section.sis_section_id)
    .map(section => section.sis_section_id)

  return { sections, crossListedSections, sectionIds }
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

async function getStudentSummary (canvas, courseId) {
  try {
    const students = canvas.list(
      `/courses/${courseId}/analytics/student_summaries`
    )
    let pageViews = 0
    let numberOfStudents = 0
    let totalParticipations = 0
    for await (student of students) {
      numberOfStudents++
      totalParticipations += student.participations
      pageViews += student.page_views
    }

    return {
      pageViews,
      averageParticipation: numberOfStudents
        ? totalParticipations / numberOfStudents
        : 0
    }
  } catch (e) {
    // Note: Enable some extra logging for debugging!
    /*console.warn(
      `Something went wrong when fetching student summaries for course ${courseId}`
    )
    console.warn(e)*/
    return false
  }
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

async function getGroupData (canvas, courseId) {
  const groupsWithMembers = (
    await canvas.list(`/courses/${courseId}/groups`).toArray()
  ).filter(group => group.members_count > 0)
  return groupsWithMembers.length
}

async function getAssignmentData (canvas, courseId) {
  const publishedAssignments = (
    await canvas.list(`/courses/${courseId}/assignments`).toArray()
  ).filter(assignment => assignment.published)

  const publishedQuizAssignments = publishedAssignments.filter(
    assignment => assignment.is_quiz_assignment
  )

  const publishedLTIAssignments = publishedAssignments.filter(
    assignment => assignment.is_quiz_lti_assignment
  )

  const assignmentSubmissions = (
    await canvas
      .list(`/courses/${courseId}/students/submissions`, {
        'student_ids[]': 'all',
        assignment_ids: publishedAssignments.map(assignment => assignment.id),
        workflow_state: ['graded', 'submitted', 'pending_review']
      })
      .toArray()
  ).length

  return {
    assignments: publishedAssignments.length,
    quizAssignments: publishedQuizAssignments.length,
    ltiAssignments: publishedLTIAssignments.length,
    assignmentSubmissions
  }
}

async function getDiscussionData (canvas, courseId) {
  const topics = canvas.list(`/courses/${courseId}/discussion_topics`)

  let discussions = 0
  let posts = 0
  for await (topic of topics) {
    discussions++

    const entries = canvas.list(
      `/courses/${courseId}/discussion_topics/${topic.id}/entries`
    )
    for await (entry of entries) {
      posts++
      if (entry.has_more_replies) {
        posts += (
          await canvas
            .list(
              `/courses/${courseId}/discussion_topics/${topic.id}/entries/${entry.id}/replies`
            )
            .toArray()
        ).length
      } else {
        posts += entry.recent_replies ? entry.recent_replies.length : 0
      }
    }
  }

  return { discussions, posts }
}

async function getPages (canvas, courseId) {
  return (
    await canvas
      .list(`/courses/${courseId}/pages`, { published: true })
      .toArray()
  ).length
}

async function getFiles (canvas, courseId) {
  return (
    await canvas
      .list(`/courses/${courseId}/files`, { 'only[]': 'names' })
      .toArray()
  ).length
}

async function hasOutcomes (canvas, courseId) {
  return (
    await canvas.list(`/courses/${courseId}/outcome_group_links`).toArray()
  ).length
    ? true
    : false
}

async function getQuizData (canvas, courseId) {
  const quizzesResponse = canvas.list(`/courses/${courseId}/quizzes`)

  let quizzes = 0
  let quizSubmissions = 0
  for await (quiz of quizzesResponse) {
    if (quiz.published) {
      quizzes++
      const submissionsResponse = await canvas.get(
        `/courses/${courseId}/quizzes/${quiz.id}/submissions`
      )
      for (submission of submissionsResponse.body.quiz_submissions) {
        if (
          submission.workflow_state === 'pending_review' ||
          submission.workflow_state === 'complete'
        ) {
          quizSubmissions++
        }
      }
    }
  }

  return { quizzes, quizSubmissions }
}

async function getModuleData (canvas, courseId) {
  const modulesResponse = canvas.list(`/courses/${courseId}/modules`)

  let modules = 0
  let moduleItems = 0
  for await (mod of modulesResponse) {
    if (mod.published) {
      modules++
      const itemsResponse = canvas.list(
        `/courses/${courseId}/modules/${mod.id}/items`
      )
      for await (item of itemsResponse) {
        if (item.published) {
          moduleItems++
        }
      }
    }
  }

  return { modules, moduleItems }
}

async function getConferences (canvas, courseId) {
  return (await canvas.get(`/courses/${courseId}/conferences`)).body.conferences
    .length
}

async function getExternalTools (canvas, courseId) {
  let ltis = 0
  let redirects = 0

  const externalTools = await canvas
    .list(`/courses/${courseId}/external_tools`)
    .toArray()

  ltis = externalTools.length
  redirects = externalTools.filter(tool => REDIRECT_URL_PATTERN.test(tool.url))
    .length

  return { ltis, redirects }
}

// TODO: Using ; instead of , for now - should I?
async function start () {
  // Fetch id:s for all Canvas courses which have been exported
  // const transferredCourses = await transferToLadokData.fetchTransferredCourses()

  // Start out creating folders, cleaning files et.c.
  if (!fs.existsSync(FOLDER_NAME)) {
    fs.mkdirSync('output')
  }
  const outputPath = path.resolve('./output', "stats-courserooms.csv")
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
      'education_cycle',
      'sub-account',
      'sections',
      'cross-listed_sections',
      'section_sis_ids',
      'number_of_teachers',
      'number_of_students',
      'is_published',
      'is_viewed',
      'semester',
      'start_date',
      'periods',
      'year',
      'license',
      'visibility',
      'kopps_language',
      'canvas_language',
      // 'is_transferred_to_ladok',
      'groups',
      'assignments',
      'quiz_assignments',
      'lti_assignments',
      'assignment_submissions',
      'discussions',
      'posts',
      'pages',
      'files',
      'is_outcomes',
      'quizzes',
      'quiz_submissions',
      'modules',
      'module_items',
      'conferences',
      'is_syllabus',
      'ltis',
      'ltis_wo_redirect',
      'avg_participation',
      'page_views',
      'is_contentful'
    ]
    fs.appendFileSync(outputPath, `${courseDataHeaders.join(';')}\n`)
  }
  const canvas = CanvasApi(
    process.env.CANVAS_API_URL,
    process.env.CANVAS_ACCESS_TOKEN
  )
  const courses = canvas.list('/accounts/1/courses', {
    include: [
      'account',
      'total_students',
      'teachers',
      'concluded',
      'syllabus_body'
    ]
  })
  for await (const course of courses) {
    const courseId = course.id
    if (courseId < process.env.APPEND_FROM_ID) {
      console.debug(`Skipping ${course.name} due to append mode.`)
      continue
    }
    console.debug(`Processing /courses/${courseId}: ${course.name}`)

    const { courseCode, semester, year, roundId } = parseSisId(
      course.sis_course_id
    )

    // Step 1: gather course data
    const { educationCycle, language, periods } = await getKOPPSData(
      courseCode,
      semester,
      year,
      roundId
    )

    const courseAccountName = course.account.name
    const subAccount = getSubAccountType(courseAccountName)

    const { sections, crossListedSections, sectionIds } = await getSectionData(
      canvas,
      courseId
    )

    const { pageViews, averageParticipation } = await getStudentSummary(
      canvas,
      courseId
    )

    const courseData = [
      courseId,
      course.sis_course_id,
      `"${course.name}"`,
      courseCode,
      getCourseURL(courseId),
      getSchoolName(courseAccountName),
      educationCycle,
      subAccount,
      sections,
      crossListedSections,
      sectionIds.join(','),
      course.teachers.length, // Note: (Teacher, Course Responsible, Examiner, Ext. teacher, Course admin).
      course.total_students, // Note: Active and invited "students" (Student, Re-reg student, Ext. student, PhD student, Manually added student, Admitted not registered student).
      isPublished(course.workflow_state),
      pageViews > 0,
      semester + year,
      course.start_at, // Note: Somewhat speculative. If we can do a perfect mapping with KOPPS, the information from that source is likely better.
      periods.join(','),
      year,
      getLicense(course.license),
      getVisibility(course.is_public, course.is_public_to_auth_users),
      language,
      course.locale || 'default',
      // transferredCourses.includes(courseId)
    ]

    // Step 2: gather component data
    const groups = await getGroupData(canvas, courseId)

    const {
      assignments,
      quizAssignments,
      ltiAssignments,
      assignmentSubmissions
    } = await getAssignmentData(canvas, courseId)

    const { discussions, posts } = await getDiscussionData(canvas, courseId)

    const pages = await getPages(canvas, courseId)

    const files = await getFiles(canvas, courseId)

    const outcomes = await hasOutcomes(canvas, courseId)

    const { quizzes, quizSubmissions } = await getQuizData(canvas, courseId)

    const { modules, moduleItems } = await getModuleData(canvas, courseId)

    const conferences = await getConferences(canvas, courseId)

    const { ltis, redirects } = await getExternalTools(canvas, courseId)

    const componentData = [
      groups,
      assignments, // Note: "New Quizzes" are treated as assignments due to being an LTI app
      quizAssignments, // Note: "Old Quizzes" are included in assignments if they are of type "graded"
      ltiAssignments,
      assignmentSubmissions,
      discussions,
      posts,
      pages,
      files,
      outcomes,
      quizzes,
      quizSubmissions,
      modules,
      moduleItems,
      conferences,
      course.syllabus_body ? true : false,
      ltis,
      ltis - redirects
    ]

    // Step 3: gather participation data
    const contentful = assignments + quizzes + modules > 3
    const participationData = [averageParticipation, pageViews, contentful]

    // Step 4: append data to file
    const outputData = courseData
      .concat(componentData)
      .concat(participationData)
    fs.appendFileSync(outputPath, `${outputData.join(';')}\n`)
  }
}

start()
