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

async function getGradeChanges(course, startTime) {
  const {body: auditLog} = await canvas.get(`audit/grade_change/courses/${course.id}`, {
    start_time: startTime
  })

  console.log(auditLog.events)

  return auditLog.events.map(event => event.created_at)
}

async function start () {
  console.log('Writing to /tmp/stats.csv and /tmp/audit-public.csv')
  const writeStatsContent = content => fs.appendFileSync('/tmp/stats.csv', content.join(',') + '\n')
  const writeAuditContent = content => fs.appendFileSync('/tmp/audit-public.csv', content.join(',') + '\n')

  fs.writeFileSync("/tmp/stats.csv", [
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
  ].join(",") + "\n")

  fs.writeFileSync("/tmp/audit-public.csv", [
    'date',
    'course_id'
  ].join(",") + "\n")

  const courses = canvas.list(`/accounts/56/courses`, {include: 'total_students'})

  for await (const course of courses) {
    const analytics = await getAnalytics(course)
    const details = await getDetails(course)
    const gradeChanges = await getGradeChanges(course, "2020-08-01T00:00:00")

    writeStatsContent([
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

    for (const gradeChange of gradeChanges) {
      writeAuditContent([
        gradeChange,
        course.id
      ])
    }
  }
}

start()
