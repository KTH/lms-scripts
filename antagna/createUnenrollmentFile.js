const inquirer = require('inquirer')
const CanvasApi = require('kth-canvas-api')
process.env['NODE_ENV'] = 'production'
const csvFile = require('./csvFile')
require('colors')
const fs = require('fs')

const sectionFileName = 'csv/unenroll-observers.csv'
try {
  fs.mkdirSync('csv')
} catch (e) {
}

try {
  fs.unlinkSync(sectionFileName)
} catch (e) {
}

module.exports = async function createFile () {
  const {api} = await inquirer.prompt(
    {
      message: 'Vilken miljö?',
      name: 'api',
      choices: [
        {name: 'test', value: {apiUrl: 'https://kth.test.instructure.com/api/v1'}},
        {name: 'prod', value: {apiUrl: 'https://kth.instructure.com/api/v1'}},
        {name: 'beta', value: {apiUrl: 'https://kth.beta.instructure.com/api/v1'}}
      ],
      type: 'list'
    })
  const {apiUrl} = api

  const {apiKey} = await inquirer.prompt({
    message: 'Klistra in api nyckel till Canvas här',
    name: 'apiKey',
    type: 'string'
  })
  const canvasApi = new CanvasApi(apiUrl, apiKey)

  await csvFile.writeLine(['section_id', 'user_id', 'role', 'status'], sectionFileName)
  const courses = await canvasApi.get(`/accounts/1/courses?per_page=100`)
  for (let course of courses) {
    const enrollments = await canvasApi.get(`/courses/${course.id}/enrollments?role[]=Admitted not registered&per_page=100`)
    for (let enrollment of enrollments) {
      await csvFile.writeLine([enrollment.sis_section_id, enrollment.sis_user_id, enrollment.role, 'DELETED'], sectionFileName)
    }
  }
  console.log('Done.'.green)
}
