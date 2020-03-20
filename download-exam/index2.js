require('dotenv').config()
const CanvasApi = require('@kth/canvas-api')
const inquirer = require('inquirer')
const FormData = require('form-data')
const got = require('got')
const fs = require('fs')
const os = require('os')
const util = require('util')
const path = require('path')

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
  const canvas = CanvasApi(process.env.CANVAS_API_URL, process.env.CANVAS_API_TOKEN)

  const courseId = 8318
  const assignmentId = 108237
  const kthId = 'u1a4mc9g'
  const filePath = 'exams/AF1733/2020-03-10/u1a4mc9g-UDQ7IQIP0000.pdf'

  // Get the user ID
  const { body: user } = await canvas.get(`/users/sis_user_id:${kthId}`)
  const userId = user.id

  await submitFile(courseId, assignmentId, userId, filePath)
}

start()
  .catch(e => {
    console.error(e)
  })
