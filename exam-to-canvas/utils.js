const inquirer = require('inquirer')
const Canvas = require('@kth/canvas-api')

module.exports.initCanvas = async function initCanvas () {
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

module.exports.chooseCourse = async function chooseCourse (canvas) {
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
