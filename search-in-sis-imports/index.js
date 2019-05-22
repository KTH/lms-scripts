const inquirer = require('inquirer')
const CanvasApi = require('kth-canvas-api')
const got = require('got')
require('dotenv').config()
require('colors')

async function search () {
  const apiUrl = process.env.CANVAS_API_URL || (await inquirer.prompt(
    {
      message: 'Vilken miljö?',
      name: 'api',
      choices: [
        { name: 'test', value: { apiUrl: 'https://kth.test.instructure.com/api/v1' } },
        { name: 'prod', value: { apiUrl: 'https://kth.instructure.com/api/v1' } },
        { name: 'beta', value: { apiUrl: 'https://kth.beta.instructure.com/api/v1' } }
      ],
      type: 'list'
    })).api.apiUrl

  const apiKey = process.env.CANVAS_API_KEY || (await inquirer.prompt({
    message: 'Klistra in api nyckel till Canvas här',
    name: 'apiKey',
    type: 'string'
  })).apiKey

  const { searchString } = await inquirer.prompt({
    name: 'searchString',
    message: 'Vad vill du söka efter? Skriv req exp här',
    type: 'string'
  })
  const re = new RegExp(searchString)

  const { startPage } = await inquirer.prompt({
    name: 'startPage',
    message: 'Starta på sida',
    default: 1,
    type: 'number'
  })

  const canvasApi = new CanvasApi(apiUrl, apiKey)
  canvasApi.get(`accounts/1/sis_imports?per_page=100&page=${startPage}`, async data => {
    console.log(`Checking sis import from date ${data.sis_imports[0].created_at}`.yellow)
    for (const sis of data.sis_imports) {
      const url = sis.csv_attachments && sis.csv_attachments[0].url
      if (url) {
        const { body } = await got({
          url,
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        })
        if (re.exec(body)) {
          console.log(`Found match in ${JSON.stringify(sis)}`.green)
          console.log(body.green)
        }
      }
    }
  })
}
search()
