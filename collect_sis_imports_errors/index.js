/*
* To run this script, just open a terminal and run it with node.
* Then just follow the instructions on the screen.
*/
process.env['NODE_ENV'] = 'production'
const CanvasApi = require('kth-canvas-api')
const inquirer = require('inquirer')
const moment = require('moment')
const request = require('request-promise')

async function listErrors () {
  try {
    const {apiUrl} = await inquirer.prompt(
      {
        message: 'Vilken miljö?',
        name: 'apiUrl',
        choices: [
          {name: 'prod', value: 'https://kth.instructure.com/api/v1'},
          {name: 'test', value: 'https://kth.test.instructure.com/api/v1'},
          {name: 'beta', value: 'https://kth.beta.instructure.com/api/v1'}
        ],
        type: 'list'
      })

    const {apiKey} = await inquirer.prompt({
      message: 'Klistra in api nyckel till Canvas här',
      name: 'apiKey',
      type: 'string'
    })

    const canvasApi = new CanvasApi(apiUrl, apiKey)

    const {numOfDays} = await inquirer.prompt({
      message: 'Hur många dagar bakåt?',
      name: 'numOfDays',
      type: 'number',
      default: 7
    })

    const from = moment().subtract(numOfDays, 'days').utc().toDate().toISOString()

    const allSisImports = await canvasApi.get(`/accounts/1/sis_imports?created_since=${from}&per_page=100`)

    const flattenedSisImports = allSisImports
      .reduce((a, b) => a.concat(b.sis_imports), []) // Flatten every page

    const reportUrls = flattenedSisImports.map(_sisObj => (_sisObj.errors_attachment && _sisObj.errors_attachment.url) || [])
      .reduce((a, b) => a.concat(b), [])

    console.log('Searching for warnings and errors:')

    for (let url of reportUrls) {
      const warnings = await request({
        uri: url,
        headers: {'Connection': 'keep-alive'}
      })
      let filteredWarn = warnings.split('\n')
        .filter(warning => !warning.includes('Neither course nor section existed'))
        .filter(warning => !warning.includes('An enrollment referenced a non-existent section'))
        .filter(warning => !/There were [\d,]+ more warnings/.test(warning))
        .filter(warning => warning !== '')
      if (filteredWarn.length > 0) {
        console.log(filteredWarn)
      }
    }
  } catch (e) {
    console.error(e)
  }
}
listErrors()
