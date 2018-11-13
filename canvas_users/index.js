require('dotenv').config()
if (!(process.env.CANVAS_API_URL && process.env.CANVAS_API_KEY && process.env.USERS_CSV_FILE)) {
  console.log(
    'This app requires an environment file with the following entries:\n' +
    'CANVAS_API_URL & CANVAS_API_KEY & USERS_CSV_FILE'
  )
}

const CanvasApi = require('kth-canvas-api')
const canvasApi = new CanvasApi(process.env.CANVAS_API_URL, process.env.CANVAS_API_KEY)

const fs = require('fs')
const readline = require('readline')
const rl = readline.createInterface({
  input: fs.createReadStream(process.env.USERS_CSV_FILE),
  crlfDelay: Infinity
})

async function createUser (canvasUser) {
  try {
    await canvasApi.createUser(canvasUser)
  } catch (e) {
    // Only alert the user about errors that are not related to trying to create an already existing user
    if (!e.message.includes('"type":"taken"')) {
      console.log(`Failed to create the user: ${canvasUser}, due to: ${e}`)
    }
  } finally {
    rl.resume()
  }
}

let lineCounter = 0
let headers = []
rl.on('line', (line) => {
  const elements = line.split(',')
  if (!lineCounter) {
    headers = elements
  } else {
    rl.pause()
    const userData = {}
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
    createUser(canvasUser)
  }
  lineCounter++
})

rl.on('close', () => {
  console.log(`Handled ${lineCounter - 1} row(s) of users!`)
})
