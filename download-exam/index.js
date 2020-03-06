const inquirer = require('inquirer')
const got = require('got')
const fs = require('fs')

async function getCourseDetails () {
  const { courseCode, termNumber } = await inquirer.prompt([
    {
      type: 'input',
      name: 'courseCode',
      message: 'Write a course code (XX0000)',
    },
    {
      type: 'input',
      name: 'termNumber',
      message: 'Write a year and term (1 = Spring / 2 = Fall). Example: 20191',
      default: '20192'
    }
  ])

  return { courseCode, termNumber }
}

async function getModules ({courseCode, termNumber}) {
  const { body: courseDetails } = await got(
    `https://api.kth.se/api/kopps/v2/course/${courseCode}/detailedinformation`,
    {
      json: true
    }
  )

  const examinationSets = Object.values(courseDetails.examinationSets)
    .sort(
      (a, b) =>
        parseInt(a.startingTerm.term, 10) - parseInt(b.startingTerm.term, 10)
    )
    .filter(e => parseInt(e.startingTerm.term, 10) <= termNumber)

  const examinationRounds =
    examinationSets[examinationSets.length - 1].examinationRounds

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
      firstName: result.documentIndiceses.find(i => i.index === 's_firstname').value,
      lastName: result.documentIndiceses.find(i => i.index === 's_lastname').value
    }))
}

async function chooseExam (exams) {
  console.log(`Got ${exams.length} exams`)
  const { answer } = await inquirer.prompt([{
    type: 'list',
    name: 'answer',
    message: 'Choose an exam',
    choices: exams.map(e => ({
      name: `${e.lastName}, ${e.firstName} (${e.date})`,
      value: e.id,
      short: e.id
    }))
  }])

  return answer
}

async function saveExam (fileId) {
  const url = `https://tentaapi.ug.kth.se/api/v2.0/windream/file/${fileId}/true`
  console.log(`Getting ${url}`)


  const {body} = await got(url, {
    json: true
  })

  console.log(`Saving file to "/tmp/${body.wdFile.fileName}"...`)
  const download = Buffer.from(body.wdFile.fileAsBase64.toString('utf-8'), 'base64')
  fs.writeFileSync(`/tmp/${body.wdFile.fileName}`, download)
}

async function start () {
  const {courseCode, termNumber} = await getCourseDetails()
  const examId = await getModules({courseCode, termNumber})
    .then(chooseModule)

  const exams = await getExams(courseCode, examId)

  while (true) {
    await chooseExam(exams)
      .then(saveExam)
  }
}

start()
