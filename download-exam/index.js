const inquirer = require('inquirer')
const got = require('got')
const fs = require('fs')
const os = require('os')
const path = require('path')
inquirer.registerPrompt('datetime', require('inquirer-datepicker-prompt'))

async function getExamDate() {
  const { courseCode } = await inquirer.prompt([
    {
      type: 'datetime',
      format: ['yyyy', '-', 'MM', '-', 'dd' ],
      name: 'examDate',
      message: 'Write the examination date for the exam'
    }
  ])

  return courseCode
}



async function getCourseCode () {
  const { courseCode } = await inquirer.prompt([
    {
      type: 'input',
      name: 'courseCode',
      message: 'Write a course code (XX0000)',
    }
  ])

  return courseCode
}

async function getModules (courseCode) {
  const { body: courseDetails } = await got(
    `https://api.kth.se/api/kopps/v2/course/${courseCode}/detailedinformation`,
    {
      json: true
    }
  )

  const examinationRounds = []
  for (const set of Object.values(courseDetails.examinationSets)) {
    for (const e of set.examinationRounds) {
      examinationRounds.push(e)
    }
  }

  return examinationRounds.map(round => ({
    id: round.ladokUID,
    name: round.examCode,
    title: round.title
  }))
}

async function chooseModule (modules) {
  const { answer } = await inquirer.prompt([
    {
      type: 'list',
      name: 'answer',
      message: 'Choose a module',
      choices: modules.map(m => ({
        name: `${m.name} (${m.title})`,
        value: m.name,
        short: m.name
      }))
    },
  ])

  return answer
}

async function getExams (courseCode, examId) {
  console.log(`Getting the list of exams in ${courseCode} (it may take a while)`)

  const { body } = await got(`https://tentaapi.ug.kth.se/api/v2.0/windream/search/documents/c_code/${courseCode}/true/false/false/false`, {
    json: true
  })

  console.log(body.documentSearchResults.length)

  return body.documentSearchResults
    .filter(result =>
      result.documentIndiceses.find(indice => indice.index === 'e_code' && indice.value === examId)
    )
    .map(result => ({
      id: result.fileId,
      date: result.createDate,
      kthId: getValue(result, 's_uid'),
      firstName: getValue(result, 's_firstname'),
      lastName: getValue(result, 's_lastname')
    }))
}

function getValue (exam, key) {
  const keyValue = exam.documentIndiceses.find(i => i.index === key)

  return keyValue && keyValue.value
}

async function chooseStudent (exams) {
  console.log(`Got ${exams.length} exams`)

  // Group by student
  const students = new Map()

  for (const exam of exams) {
    if (students.has(exam.kthId)) {
      students.set(exam.kthId, students.get(exam.kthId) + 1)
    } else {
      students.set(exam.kthId, 1)
    }
  }

  const { answer } = await inquirer.prompt([{
    type: 'list',
    name: 'answer',
    message: 'Choose a student',
    choices: Array.from(students, ([k, v]) => ({
      name: `${k} (it has ${v} exams)`,
      value: k,
    }))
  }])

  return exams
    .filter(exam => exam.kthId === answer)
    .map(exam => exam.id)
}

async function saveExams (fileIds) {
  const directory = fs.mkdtempSync(os.tmpdir())

  for (const fileId of fileIds) {
    const url = `https://tentaapi.ug.kth.se/api/v2.0/windream/file/${fileId}/true`
    console.log(`Getting ${url}`)


    const {body} = await got(url, {
      json: true
    })

    const filePath = path.join(directory, body.wdFile.fileName)

    console.log(`Saving file to "${filePath}"...`)
    const download = Buffer.from(body.wdFile.fileAsBase64.toString('utf-8'), 'base64')

    fs.writeFileSync(filePath, download)
  }
}

async function start () {
  const examDate = await getExamDate()
  const courseCode = await getCourseCode()
  const examId = await getModules(courseCode)
    .then(chooseModule)

  const exams = await getExams(courseCode, examId)

  await chooseStudent(exams)
    .then(saveExams)
}

start()
