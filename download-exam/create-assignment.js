require('dotenv').config()
const inquirer = require('inquirer')
const Canvas = require('@kth/canvas-api')
const got = require('got')


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

async function initCanvas(){
  
  const { canvasApiUrl } = await inquirer.prompt({
    type: 'list',
    name: 'canvasApiUrl',
    message: 'Select a Canvas instance',
    choices: [
      {
        name: 'test',
        value: 'https://kth.test.instructure.com/api/v1',
        short: 'test'
      },
      {
        name: 'beta',
        value: 'https://kth.beta.instructure.com/api/v1',
        short: 'beta'
      },
      {
        name: 'prod',
        value: 'https://kth.instructure.com/api/v1',
        short: 'prod'
      }
    ]
  })

  const canvasApiToken =
    process.env.CANVAS_API_TOKEN ||
    (
      await inquirer.prompt({
        name: 'value',
        message: 'Paste the Canvas API token'
      })
    ).value

  return Canvas(canvasApiUrl, canvasApiToken)
}

async function start () {
  const canvas = await initCanvas()
  const course = await chooseCourse(canvas)

  const [, courseCode, term, year] = course.sis_course_id.match(/(.*)(VT|HT)(\d{2})\d/)

  const { body: courseDetails } = await got(`https://api.kth.se/api/kopps/v2/course/${courseCode}/detailedinformation`, { json: true })
  const termUtils = {
    VT: 1,
    HT: 2,
    1: 'VT',
    2: 'HT'
  }

  const gradingSchemas = {
    AF: 889,
    PF: 609
  }

  const termNumber = `20${year}${termUtils[term]}`
  const examinationSets = Object.values(courseDetails.examinationSets)
    .sort((a, b) => parseInt(a.startingTerm.term, 10) - parseInt(b.startingTerm.term, 10))
    .filter(e => parseInt(e.startingTerm.term, 10) <= termNumber)

  const examinationRounds = examinationSets[examinationSets.length - 1].examinationRounds
  const examinationRound = await chooseLadokModule(examinationRounds)
  
    const assignmentSisID = `${course.sis_course_id}_${examinationRound.examCode}`
  //   const assignment = assignments.find(a => a.integration_data.sis_assignment_id === assignmentSisID)
  //
    const modulId = examinationRound.ladokUID

    const body = {
      assignment: {
        name: `LADOK - ${examinationRound.examCode} (${examinationRound.title})`,
        description: `This assignment is created for Ladok module <strong>"${examinationRound.title}" (${examinationRound.examCode})</strong>.<br>Scanned exams is imported into this exam as submissions.<br>This assignment is prepared to send to Ladok with the "KTH Transfer to Ladok" link.`,
        submission_types: ['online_upload'],
        grading_type: 'letter_grade',
        points_possible: 10,
        grading_standard_id: gradingSchemas[examinationRound.gradeScaleCode],
        allowed_attempts: 1,
        post_manually: false, 
        integration_id: modulId,
        integration_data: JSON.stringify({
          sis_assignment_id: assignmentSisID
        })
      }
    }
  await canvas.requestUrl(`courses/${course.id}/assignments/`, 'POST', body)
}

start().catch(e => console.error(e))
