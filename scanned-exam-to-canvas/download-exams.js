const inquirer = require('inquirer')
const got = require('got')
const fs = require('fs')
const os = require('os')
const util = require('util')
const path = require('path')

inquirer.registerPrompt('datetime', require('inquirer-datepicker-prompt'))

async function getExamDate() {
  const { examDate} = await inquirer.prompt([
    {
      type: 'datetime',
      format: ['yyyy', '-', 'mm', '-', 'dd' ],
      name: 'examDate',
      initial: new Date('2020-03-10'),
      message: 'Write the examination date for the exam'
    }
  ])

  return examDate
}

async function getCourseCode () {
  const { courseCode } = await inquirer.prompt([
    {
      type: 'input',
      name: 'courseCode',
      default: 'AF1733',
      message: 'Write a course code ',
    }
  ])

  return courseCode
}

async function getExams (courseCode, examDate) {
  console.log(`Getting the list of exams in ${courseCode} (it may take a while)`)

  const { body } = await got('https://tentaapi.ug.kth.se/api/v2.0/windream/search/documents/false', {
    method: 'POST',
    json: true,
    body: {
  "searchIndiceses": [
    {
      "index": "c_code",
      "value": courseCode,
      "useWildcard": false
    },
    {
      "index": "e_date",
      "value": examDate,
      "useWildcard": false
    }
  ],
  "includeDocumentIndicesesInResponse": true,
  "includeSystemIndicesesInResponse": false,
  "useDatesInSearch": false
}
  })

  if(!body || !body.documentSearchResults){
    console.warn('Found no exams for this date!')
    return []
  }
  console.log(body.documentSearchResults.length)

  return body.documentSearchResults
    .map(result => ({
      id: result.fileId,
      kthId: getValue(result, 's_uid')
    }))
}

function getValue (exam, key) {
  const keyValue = exam.documentIndiceses.find(i => i.index === key)

  return keyValue && keyValue.value
}

async function saveExams (courseCode, examDate, examObjects) {
  const dir = `exams/${courseCode}/${examDate}`
  const exists = util.promisify(fs.exists)
  const mkdir = util.promisify(fs.mkdir)

  if (!await exists(dir)){
    await mkdir(dir, { recursive: true })
  }

  for (const {id:fileId, kthId} of examObjects) {
    const url = `https://tentaapi.ug.kth.se/api/v2.0/windream/file/${fileId}/true`
    console.log(`Getting ${url}`)


    const {body} = await got(url, {
      json: true
    })

    const filePath = path.join(dir, `${kthId}-${ body.wdFile.fileName}`)

    console.log(`Saving file to "${filePath}"...`)
    const download = Buffer.from(body.wdFile.fileAsBase64.toString('utf-8'), 'base64')

    fs.writeFileSync(filePath, download)
  }
}

async function start () {
  const courseCode = await getCourseCode()
  const examDate = await getExamDate()

  const exams = await getExams(courseCode, examDate)
  console.log(exams)
  const examDateFormatted = `${examDate.getFullYear()}-${examDate.getMonth().toString().padStart(2, '0')}-${examDate.getDate().toString().padStart(2, '0')}`

  await saveExams(courseCode, examDateFormatted, exams)
}

start()
