/*
* To run this script, just open a terminal and run it with node.
* Then just follow the instructions on the screen.
*/
require('dotenv').config()
process.env['NODE_ENV'] = 'production'
const inquirer = require('inquirer')
const moment = require('moment')
const sisUtils = require('./sis_utils')
const ora = require('ora')

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

    const {numOfDays} = await inquirer.prompt({
      message: 'Hur många dagar bakåt?',
      name: 'numOfDays',
      type: 'number',
      default: 7
    })

    const from = moment().subtract(numOfDays, 'days').utc().toDate().toISOString()

    const spinner = ora('Fetching logs').start()
    const result = await sisUtils.getFilteredErrors(apiUrl, apiKey, from)
    spinner.stop()
    console.log(result)
  } catch (e) {
    console.error(e)
  }
}

listErrors()
