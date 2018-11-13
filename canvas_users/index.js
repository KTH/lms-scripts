require('dotenv').config()
const inquirer = require('inquirer')
const CanvasApi = require('kth-canvas-api')
const fs = require('fs')
const readline = require('readline')
const stripIndent = require('common-tags/lib/stripIndent')

async function getOptions () {
  const canvasApiUrl = process.env.CANVAS_API_URL || (await inquirer.prompt({
    message: 'Vilken miljö?',
    name: 'answer',
    choices: [
      { name: 'prod', value: 'https://kth.instructure.com/api/v1' },
      { name: 'test', value: 'https://kth.test.instructure.com/api/v1' },
      { name: 'beta', value: 'https://kth.beta.instructure.com/api/v1' }
    ],
    type: 'list'
  })).answer

  const canvasApiKey = process.env.CANVAS_API_KEY || (await inquirer.prompt({
    message: 'Klistra in api nyckel till Canvas här',
    name: 'answer',
    type: 'string'
  })).answer

  const { createEnv } = await inquirer.prompt({
    message: stripIndent(`
      We can create an .env file like this:

      CANVAS_API_URL=${canvasApiUrl}
      CANVAS_API_KEY=${canvasApiKey}

      Do you want to do it?
    `),
    name: 'createEnv',
    type: 'confirm',
    default: false
  })

  if (createEnv) {
    fs.writeFileSync('.env', stripIndent(`
      CANVAS_API_URL=${canvasApiUrl}
      CANVAS_API_KEY=${canvasApiKey}
    `))
    console.log('.env file created!')
  }


  const { fileName } = await inquirer.prompt({
    message: 'Write the csv filename that you want to import',
    name: 'fileName',
    type: 'string'
  })

  return { canvasApiUrl, canvasApiKey, fileName }
}

async function start () {
  const options = await getOptions()
  const canvasApi = new CanvasApi(options.canvasApiUrl, options.canvasApiKey)
  canvasApi.logger = {
    log: () => {},
    info: () => {},
    warn: () => {},
    error: () => {}
  }
  const rl = readline.createInterface({
    input: fs.createReadStream(options.fileName),
    crlfDelay: Infinity
  })

  let lineCounter = 0
  let headers = []
  rl.on('line', async (line) => {
    const elements = line.split(',')
    if (!lineCounter) {
      headers = elements
      lineCounter++
      return
    }

    let userData = {}
    for (let i = 0; i < headers.length; ++i) {
      userData[headers[i]] = elements[i]
    }
    const canvasUser = {
      pseudonym: {
        unique_id: userData.login_id,
        sis_user_id: userData.user_id,
        skip_registration: true,
        send_confirmation: false
      },
      user: {
        'name': `${userData.first_name} ${userData.last_name}`,
        'sortable_name': `${userData.last_name}, ${userData.first_name}`
      },
      communication_channel: {
        type: 'email',
        address: userData.email,
        skip_confirmation: true
      },
      enable_sis_reactivation: false
    }

    rl.pause()
    try {
      await canvasApi.createUser(canvasUser)
      console.log(`Canvas user ${userData.user_id} processed successfully`)
    } catch (e) {
      if (e.message.includes('"type":"taken"')) {
        console.log(`Canvas user ${userData.user_id} already exists`)
      } else {
        console.error(`Failed to create the user ${userData.user_id} due to an error`, e)
      }
    }
    rl.resume()
    lineCounter++
  })

  rl.on('close', () => {
    console.log(`Handled ${lineCounter - 1} row(s) of users!`)
  })
}

start()
