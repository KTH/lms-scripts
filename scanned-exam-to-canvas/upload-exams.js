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

async function submitFile (canvas, courseId, assignmentId, userId, filePath) {
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
        value: a,
        short: a.id
      }))
  })

  return chosen
}

async function choosePath () {
  const { path } = await inquirer.prompt({
    type: 'input',
    name: 'path',
    message: 'Where are the exams?',
    default: './exams/ME1010/TEN2/2020-10-20/'
  })

  return path
}

async function checkEnrollments (canvas, course, kthIds) {
  const students = (
    await canvas.list(`/courses/${course.id}/enrollments`).toArray()
  )
  .map(enrollment => enrollment.sis_user_id)

  const found = kthIds.filter(id => students.find(st => st === id))
  const notFound = kthIds.filter(id => !students.find(st => st === id))

  return { found, notFound }
}

// Returns an array of kth ids
async function getEmptySlots(canvas, course, assignment){
  const submissions = await canvas.list(`/courses/${course.id}/assignments/${assignment.id}/submissions`, {include:['user']}).toArray()
  return submissions
    .filter(sub => sub.workflow_state === 'unsubmitted')
    .map(sub => sub.user.sis_user_id)
}

async function start () {
  const canvas = await utils.initCanvas()
  const course = await utils.chooseCourse(canvas)
  const assignment = await chooseAssignment(canvas, course)

  const directoryPath = await choosePath()
  const files = await fs.promises.readdir(directoryPath)

  console.log(`Exams found: ${files.length}. Checking enrollments...`)

  const kthIds = files.map(file => file.split('-')[0])
  const { found, notFound } = await checkEnrollments(canvas, course, kthIds)


  if (notFound.length > 0) {
    console.log(`There are ${notFound.length} students WITH exam but not present in Canvas`)
    for (const student of notFound) {
      console.log('-', student)
    }
  }

  const emptySlots  = await getEmptySlots(canvas, course, assignment)
  const uploadableFiles = files.filter(file => {
    const kthId = file.split('-')[0]
    return emptySlots.includes(kthId)
  })

  console.log(uploadableFiles)

  const { ok } = await inquirer.prompt({
    name: 'ok',
    type: 'confirm',
    message: `We are going to upload ${uploadableFiles.length}/${kthIds.length} exams in course ${course.id}, assignment ${assignment.id}. Continue?`
  })

  if (!ok) {
    return
  }




  let i = 0
  for (const file of uploadableFiles) {
    i++
    const kthId = file.split('-')[0]
    const filePath = path.join(__dirname, directoryPath, file)

    if (!found.find(st => st === kthId)) {
      continue
    }

    console.log(`${i}/${files.length}. Uploading for ${kthId}...`)

    const { body: user } = await canvas.get(`/users/sis_user_id:${kthId}`)
    await submitFile(canvas, course.id, assignment.id, user.id, filePath)
  }
}

start()
  .catch(e => {
    console.error(e)
  })
