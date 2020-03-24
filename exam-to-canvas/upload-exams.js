require('dotenv').config()
const FormData = require('form-data')
const got = require('got')
const fs = require('fs')
const path = require('path')
const utils = require('./utils')
const inquirer = require('inquirer')

async function sendFile ({ upload_url, upload_params }, filePath) {
  const form = new FormData()

  for (const key in upload_params) {
    if (upload_params[key]) {
      form.append(key, upload_params[key])
    }
  }

  form.append('attachment', fs.createReadStream(filePath))

  return got
    .post({
      url: upload_url,
      json: false,
      body: form
    })
    .then(response => {
      response.body = JSON.parse(response.body)
      return response
    })
}

async function submitFile (courseId, assignmentId, userId, filePath) {
  // Create the "spot" for the submission file
  const { body: spot } = await canvas.requestUrl(
    `/courses/${courseId}/assignments/${assignmentId}/submissions/${userId}/files`,
    'POST'
  )

  // Upload the actual file
  const { body: uploadedFile } = await sendFile(spot, filePath)

  // 3. Link the uploaded file with the submission
  await canvas.requestUrl(
    `/courses/${courseId}/assignments/${assignmentId}/submissions/`,
    'POST',
    {
      submission: {
        submission_type: 'online_upload',
        user_id: userId,
        file_ids: [uploadedFile.id]
      }
    }
  )
}

function isValidAssignment (assignment) {
  if (assignment.workflow_state !== 'published') {
    return false
  }

  return assignment.submission_types.includes('online_upload')
}

async function chooseAssignment (canvas, course) {
  const assignments = await canvas.list(`/courses/${course.id}/assignments`).toArray()

  const { chosen } = await inquirer.prompt({
    type: 'list',
    name: 'chosen',
    message: 'Select an assignment',
    choices: assignments
      .filter(isValidAssignment)
      .map(a => ({
        name: `${a.id}: ${a.name}`,
        value: a.id,
        short: a.id
      }))
  })
  console.log(chosen)

  return chosen
}

async function checkEnrollments (canvas, course, kthIds) {
  const students = (
    await canvas.list(`/courses/${course.id}/enrollments`).toArray()
  )
  .map(enrollment => enrollment.sis_user_id)

  const found = kthIds.filter(id => students.find(st => st === id)).length

  const { ok } = await inquirer.prompt({
    name: 'ok',
    type: 'confirm',
    message: `Found ${found}/${kthIds.length} enrollments. Continue?`
  })

  if (!ok) {
    process.exit()
  }
}

async function start () {
  const canvas = await utils.initCanvas()
  const course = await utils.chooseCourse(canvas)
  const assignment = await chooseAssignment(canvas, course)

  const directoryPath = 'exams/AF1733/2020-03-10'
  const files = await fs.promises.readdir(directoryPath)

  console.log(`Exams found: ${files.length}`)

  const kthIds = files.map(file => file.split('-')[0])
  await checkEnrollments(canvas, course, kthIds)

  console.log('Starting to upload exams')
  for (const file of files) {
    const kthId = file.split('-')[0]
    const filePath = path.join(__dirname, directoryPath, file)

    if (!students.find(st => st === kthId)) {
      console.log(`The student ${kthId} is not enrolled. Ignoring`)
      continue
    }

    console.log(`Uploading for ${kthId}...`)

    const { body: user } = await canvas.get(`/users/sis_user_id:${kthId}`)
    await submitFile(course.id, assignment.id, user.id, filePath)
  }
}

start()
  .catch(e => {
    console.error(e)
  })
