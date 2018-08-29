/*
* To run this script, just open a terminal and run it with node.
* Then just follow the instructions on the screen.
*/
require('dotenv').config()
process.env['NODE_ENV'] = 'production'
const inquirer = require('inquirer')
const moment = require('moment')
const sisUtils = require('../sis_import_utils')
const ora = require('ora')

async function listErrors () {
  try {
    const { apiUrl } = await inquirer.prompt(
      {
        message: 'Vilken miljö?',
        name: 'apiUrl',
        choices: [
          { name: 'prod', value: 'https://kth.instructure.com/api/v1' },
          { name: 'test', value: 'https://kth.test.instructure.com/api/v1' },
          { name: 'beta', value: 'https://kth.beta.instructure.com/api/v1' }
        ],
        type: 'list'
      })

    const { apiKey } = await inquirer.prompt({
      message: 'Klistra in api nyckel till Canvas här',
      name: 'apiKey',
      type: 'string'
    })

    const { numOfDays } = await inquirer.prompt({
      message: 'Hur många dagar bakåt?',
      name: 'numOfDays',
      type: 'number',
      default: 7
    })

    const from = moment().subtract(numOfDays, 'days').utc().toDate().toISOString()

    const spinner = ora('Fetching logs: ').start()

    // This function is called in every call to Canvas API
    // If there are SIS imports going on, asks the user if they want to abort the operation
    async function manualStop (result) {
      // Map between Canvas "workflow_state" property and "finished or not"
      const finishedStates = {
        created: false,
        importing: false,
        cleanup_batch: false,
        imported: true,
        imported_with_messages: true,
        aborted: true,
        failed_with_messages: true,
        failed: true
      }

      const total = result.sis_imports.length
      const finished = result.sis_imports
        .filter(s => finishedStates[s.workflow_state])
        .length

      if (finished < total) {
        spinner.stop()
        const { continueFetch } = await inquirer.prompt({
          name: 'continueFetch',
          message: `There are ${total - finished} imports going on now. Do you still want to continue?`,
          choices: [
            { name: 'Yes', value: true },
            { name: 'No', value: false }
          ],
          type: 'list'
        })

        if (!continueFetch) {
          throw new Error()
        }
        spinner.start()
      }
    }

    const result = await sisUtils.getFilteredErrors(apiUrl,
      apiKey,
      from,
      process.env.ugUrl,
      process.env.ugUsername,
      process.env.ugPwd,
      manualStop
    )
    spinner.stop()
    console.log(result)
  } catch (e) {
    console.error(e)
  }
}

listErrors()
