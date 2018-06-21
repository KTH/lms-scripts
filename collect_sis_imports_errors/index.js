/*
* To run this script, just open a terminal and run it with node.
* Then just follow the instructions on the screen.
*/
require('dotenv').config()
process.env['NODE_ENV'] = 'production'
const CanvasApi = require('kth-canvas-api')
const inquirer = require('inquirer')
const moment = require('moment')
const request = require('request-promise')
const ldap = require('ldapjs')
const util = require('util')

async function getUserInfo (userId, ldapClient) {
  const searchResult = await new Promise((resolve, reject) => {
    ldapClient.search('OU=UG,DC=ug,DC=kth,DC=se', {
      scope: 'sub',
      filter: `(&(ugKthid=${userId}))`,
      attributes: ['memberOf'],
      timeLimit: 10,
      paging: true,
      paged: {
        pageSize: 1000,
        pagePause: false
      }
    }, (err, res) => {
      if (err) {
        reject(err)
        return
      }
      const hits = []
      res.on('searchEntry', entry => {
        hits.push(entry.object)
      })
      res.on('end', entry => {
        if (entry.status !== 0) {
          reject(new Error(`Rejected with status: ${entry.status}`))
          return
        }
        resolve(hits)
      })
      res.on('error', reject)
    })
  })
  return searchResult
}

async function isUserStipendiat (userId, ldapClient) {
  const userInfo = await getUserInfo(userId, ldapClient)
  return userInfo[0].memberOf.find((item) => {
    return item.includes('CN=pa.stipendiater')
  }) !== undefined
}

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

    const ldapClient = ldap.createClient({
      url: process.env.ugUrl
    })
    const ldapClientBindAsync = util.promisify(ldapClient.bind).bind(ldapClient)
    await ldapClientBindAsync(process.env.ugUsername, process.env.ugPwd)
    console.log('Searching for warnings and errors:')
    console.log('sis_import_id,file,message,row')
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

      // First post is always a header and can be ignored
      filteredWarn.shift()
      if (filteredWarn.length > 0) {
        for (let item of filteredWarn) {
          if (item.includes('User not found')) {
            const message = item.split(',')[2]
            const userId = message.substring(message.length - 8)
            const stipendiat = await isUserStipendiat(userId, ldapClient)
            if (!stipendiat) {
              console.log(item)
            }
          } else {
            console.log(item)
          }
        }
      }
    }
    const ldapClientUnbindAsync = util.promisify(ldapClient.unbind).bind(ldapClient)
    await ldapClientUnbindAsync()
  } catch (e) {
    console.error(e)
  }
}

listErrors()
