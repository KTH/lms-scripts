require('dotenv').config()
const CanvasApi = require('@kth/canvas-api')
const FormData = require('form-data')
const got = require('got')
const fs = require('fs')
const path = require('path')
const canvas = CanvasApi(process.env.CANVAS_API_URL, process.env.CANVAS_API_TOKEN)

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

async function start () {
  const courseId = 17771
  const assignmentId = 108238
  const directoryPath = 'exams/AF1733/2020-03-10'

  const files = await fs.promises.readdir(directoryPath)

  console.log(`Exams found: ${files.length}`)
  console.log(`Checking enrollments in the course ${courseId}`)
  const students = (
    await canvas.list(`/courses/${courseId}/enrollments`).toArray()
  )
  .map(enrollment => enrollment.sis_user_id)

  let found = 0
  let notFound = 0
  for (const file of files) {
    const kthId = file.split('-')[0]

    if (students.find(st => st === kthId)) {
      found++
    } else {
      notFound++
    }
  }
  console.log(`Enrolled: ${found}. Not enrolled: ${notFound}`)
  console.log()
  console.log()
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
    const userId = user.id
    await submitFile(courseId, assignmentId, userId, filePath)
  }
}

start()
  .catch(e => {
    console.error(e)
  })
