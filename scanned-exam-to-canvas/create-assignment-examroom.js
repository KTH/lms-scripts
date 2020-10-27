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
      default: '25342',
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

  const gradingStandard = await chooseGradingStandard(canvas)

    const assignmentSisID = `${course.sis_course_id}_scanned_exams`

    const body = {
      assignment: {
        name: `Test salstenta`,
        description: ``,
        submission_types: ['online_upload'],
        grading_type: 'letter_grade',
        points_possible: 10,
        grading_standard_id: gradingStandard,
        allowed_attempts: 1
      }
    }
  await canvas.requestUrl(`courses/${course.id}/assignments/`, 'POST', body)
  console.log('Done.')
}

start().catch(e => console.error(e))
