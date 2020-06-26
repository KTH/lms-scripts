require('dotenv').config()
const inquirer = require('inquirer')
const got = require('got')
const utils = require('./utils')

async function chooseLadokModule(_ladokModules) {
  const ladokModules = _ladokModules.map(m => ({name: m.examCode, ...m}))

    const { ladokModule} = await inquirer.prompt({
      name: 'ladokModule',
      type: 'list',
      message: 'For which Ladok module do you want to create an assignment?',
      choices: ladokModules
    })

  return _ladokModules.find(m => m.examCode === ladokModule)
}

async function chooseCourse (canvas) {
  let course

  while (!course) {
    const { courseId } = await inquirer.prompt({
      name: 'courseId',
      type: 'input',
      message: 'Write the canvas course ID (you can prefix "sis_course_id:" to use the SIS ID)',
      default: 'sis_course_id:A11IYAVT191',
    })

    try {
      course = (await canvas.get(`courses/${courseId}`)).body

      const { ok } = await inquirer.prompt({
        name: 'ok',
        type: 'confirm',
        message: `Chosen course is "${course.name}". Is correct?`
      })

      if (!ok) {
        course = null
      }
    } catch (e) {
      console.error(e)
    }
  }

  return course
}

async function chooseGradingStandard (canvas, koppsGradingStandard) {
  const standards = await canvas.list('accounts/1/grading_standards').toArray()


  const {chosenStandard} = await inquirer.prompt({
    name: 'chosenStandard',
    type: 'list',
    message: `Choose the grading standard (in kopps it is ${koppsGradingStandard})`,
    choices: standards.map(s => ({
      value: s.id,
      name: s.title
    }))
  })

  return chosenStandard
}

async function start () {
  const canvas = await utils.initCanvas()
  const course = await chooseCourse(canvas)

  const [, courseCode, term, year] = course.sis_course_id.match(/(.*)(VT|HT)(\d{2})\d/)

  const { body: courseDetails } = await got(`https://api.kth.se/api/kopps/v2/course/${courseCode}/detailedinformation`, { json: true })
  const termUtils = {
    VT: 1,
    HT: 2,
    1: 'VT',
    2: 'HT'
  }

  const termNumber = `20${year}${termUtils[term]}`
  const examinationSets = Object.values(courseDetails.examinationSets)
  .sort((a, b) => parseInt(a.startingTerm.term, 10) - parseInt(b.startingTerm.term, 10))
  .filter(e => parseInt(e.startingTerm.term, 10) <= termNumber)

  const examinationRounds = examinationSets[examinationSets.length - 1].examinationRounds
  const examinationRound = await chooseLadokModule(examinationRounds)
  const gradingStandard = await chooseGradingStandard(canvas, examinationRound.gradeScaleCode)

    const assignmentSisID = `${course.sis_course_id}_${examinationRound.examCode}`
  //   const assignment = assignments.find(a => a.integration_data.sis_assignment_id === assignmentSisID)
  //
    const modulId = examinationRound.ladokUID

    const body = {
      assignment: {
        name: `${examinationRound.examCode} (${examinationRound.title})`,
        description: `This assignment is created for Ladok module <strong>"${examinationRound.title}" (${examinationRound.examCode})</strong>.<br>Scanned exams is imported into this exam as submissions.`,
        submission_types: ['online_upload'],
        grading_type: 'letter_grade',
        points_possible: 10,
        grading_standard_id: gradingStandard,
        allowed_attempts: 1,
        integration_id: modulId,
        integration_data: JSON.stringify({
          sis_assignment_id: assignmentSisID
        })
      }
    }
  await canvas.requestUrl(`courses/${course.id}/assignments/`, 'POST', body)
  console.log('Done.')
}

start().catch(e => console.error(e))
