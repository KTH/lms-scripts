require('dotenv').config()
const CanvasApi = require('@kth/canvas-api')
const fs = require('fs')

const canvas = CanvasApi('https://kth.instructure.com/api/v1', process.env.CANVAS_API_TOKEN)

function getTerm (course) {
  if (!course.sis_course_id) {
    return ''
  }

  const found = course.sis_course_id.match(/(\w{6,7})((VT|HT)\d\d)(\d)/)

  if (!found) {
    return ''
  }
  return found[2]
}

async function getAnalytics (course) {
  try {
    const activity = await canvas.list(`/courses/${course.id}/analytics/activity`).toArray()

    return activity
      .reduce(
        (acc, value) => ({
          views: acc.views + value.views,
          participations: acc.participations + value.participations
        }),
        {views: 0, participations: 0}
      )
  } catch (err) {
    return {views: 0, participations: 0}
  }
}

async function getDetails (course) {
  const modules = await canvas.list(`/courses/${course.id}/modules`).toArray()
  const assignments = await canvas.list(`/courses/${course.id}/assignments`).toArray()
  const quizzes = await canvas.list(`/courses/${course.id}/quizzes`).toArray()

  return {
    modules: modules.length,
    assignments: assignments.length,
    quizzes: quizzes.length
  }
}

async function start () {
  const schools = new Map([
    [14, 'ABE'],  // "ABE" in Canvas
    [17, 'CBH'],  // "BIO" in Canvas
    [22, 'CBH'],  // "CHE" in Canvas
    [23, 'EECS'], // "CSC" in Canvas
    [24, 'ITM'],  // "ECE" in Canvas
    [25, 'EECS'], // "EES" in Canvas
    [26, 'EECS'], // "ICT" in Canvas
    [27, 'ITM'],  // "ITM" in Canvas
    [28, 'SCI'],  // "SCI" in Canvas
    [29, 'CBH'],  // "CHE" in Canvas
    [59, 'EECS'], // "EECS" in Canvas
    [63, 'CBH'],  // "CBH" in Canvas
    [67, 'GVS']   // "GVS" in Canvas
  ])

  console.log('Writing to /tmp/stats.csv')
  const filePath = '/tmp/stats.csv'
  const writeHeaders = headers => fs.writeFileSync(filePath, headers.join(',') + '\n')
  const writeContent = content => fs.appendFileSync(filePath, content.join(',') + '\n')

  writeHeaders([
    'school_id',
    'course_id',
    'course_sis_id',
    'term',
    'workflow_state',

    'public',
    'public_to_auth',

    'license',

    'participations',
    'views',

    'assignments',
    'modules',
    'quizzes'
  ])

  for (const [schoolId, schoolName] of schools) {
    const courses = canvas.list(`/accounts/${schoolId}/courses`)

    for await (const course of courses) {
      const analytics = await getAnalytics(course)
      const details = await getDetails(course)

      writeContent([
        schoolName,
        course.id,
        course.sis_course_id,
        getTerm(course),
        course.workflow_state,

        course.is_public,
        course.is_public_to_auth_users,

        course.license,

        analytics.participations,
        analytics.views,

        details.assignments,
        details.modules,
        details.quizzes
      ])
    }
  }
}

start()
