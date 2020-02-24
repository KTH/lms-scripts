require('dotenv').config()
const CanvasApi = require('@kth/canvas-api')
const fs = require('fs')

const canvas = CanvasApi('https://kth.instructure.com/api/v1', process.env.CANVAS_API_TOKEN)

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
  const assignments = await canvas.list(`/courses/${course.id}/assignments`).toArray()

  return {
    assignments: assignments.length
  }
}

async function start () {

  console.log('Writing to /tmp/stats.csv')
  const filePath = '/tmp/stats.csv'
  const writeHeaders = headers => fs.writeFileSync(filePath, headers.join(',') + '\n')
  const writeContent = content => fs.appendFileSync(filePath, content.join(',') + '\n')

  writeHeaders([
    'course_id',
    'course_sis_id',
    'workflow_state',
    'total_students',

    'public',
    'public_to_auth',

    'license',

    'participations',
    'views',

    'assignments'
  ])

  const courses = canvas.list(`/accounts/56/courses`, {include: 'total_students'})

  for await (const course of courses) {
    const analytics = await getAnalytics(course)
    const details = await getDetails(course)

    writeContent([
      course.id,
      course.sis_course_id,
      course.workflow_state,
      course.total_students,

      course.is_public,
      course.is_public_to_auth_users,

      course.license,

      analytics.participations,
      analytics.views,

      details.assignments
    ])
  }
}

start()
