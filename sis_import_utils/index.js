const CanvasApi = require('kth-canvas-api')
const ldap = require('ldapjs')
const util = require('util')
const request = require('request-promise')
const papaparse = require('papaparse')

async function getUserInfo (userId, ldapClient) {
  const searchResult = await new Promise((resolve, reject) => {
    ldapClient.search('OU=UG,DC=ug,DC=kth,DC=se', {
      scope: 'sub',
      filter: `(&(ugKthid=${userId}))`,
      attributes: ['memberOf', 'ugPrimaryAffiliation'],
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

async function isUserStipendiatOrOther (userId, ldapClient) {
  const userInfo = await getUserInfo(userId, ldapClient)
  return userInfo[0] && userInfo[0].memberOf && userInfo[0].memberOf.find((item) => {
    return item.includes('CN=pa.stipendiater')
  }) !== undefined || userInfo[0].ugPrimaryAffiliation === 'other'
}

async function parseWarnings (warnings, ldapClient) {
  const filtered = warnings
    .filter(w => w.message !== '')
    .filter(w => !/There were [\d,]+ more warnings/.test(w.message))
    .filter(w => !w.message.includes('Neither course nor section existed'))
    .filter(w => !w.message.includes('An enrollment referenced a non-existent section'))

  const result = []

  for (const w of filtered) {
    if (w.message.includes('User not found')) {
      const userId = w.message.substring(w.message.length - 8)
      try {
        const userInfo = await getUserInfo(userId, ldapClient)
        const mOf = userInfo && userInfo[0] && userInfo[0].memberOf && userInfo[0].memberOf
        const ugPA = userInfo && userInfo[0] && userInfo[0].ugPrimaryAffiliation

        result.push({
          message: w.message,
          row: w.row,
          is_stependiater: mOf && mOf.find && mOf.find(i => i.includes('CN=pa.stipendiater')),
          is_other: ugPA && ugPA === 'other'
        })
      } catch (e) {
        //console.error(`Error trying to search ${userId} in LDAP`, e)
        result.push({
          message: w.message,
          row: w.row,
          is_stependiater: false,
          is_other: false
        })
      }
    } else {
      result.push({
        message: w.message,
        row: w.row,
        is_stependiater: false,
        is_other: false
      })
    }
  }
  // "Syncrhnous filter"
  return result
}

async function traverseErrors (from, data, callback, options = {}) {
  const log = options.log || console
  const canvasApiUrl = data.canvasApiUrl || process.env.CANVAS_API_URL
  const canvasApiToken = data.canvasApiToken || process.env.CANVAS_API_TOKEN
  const ugUrl = data.ugUrl || process.env.UG_URL
  const ugUsername = data.ugUsername || process.env.UG_USERNAME
  const ugPassword = data.ugPassword || process.env.UG_PASSWORD

  const canvasApi = new CanvasApi(canvasApiUrl, canvasApiToken)
  canvasApi.logger = log

  const ldapClient = ldap.createClient({ url: ugUrl })
  const ldapClientBind = util.promisify(ldapClient.bind).bind(ldapClient)
  await ldapClientBind(ugUsername, ugPassword)

  await canvasApi.get(`/accounts/1/sis_imports?created_since=${from}&per_page=100`, async page => {
    const errors = [] 

    for (const sisImport of page.sis_imports) {
      if (sisImport.errors_attachment && sisImport.errors_attachment.url) {
        const warnings = await request({
          uri: sisImport.errors_attachment.url,
          headers: {'Connection': 'keep-alive'}
        })

        const warnings2 = (papaparse.parse(warnings, {header: true}).data)
          .filter(w => w.message)

        const parsed = await parseWarnings(warnings2, ldapClient)

        if (parsed.length > 0) {
          callback(Object.assign(sisImport, {
            kth_warnings: parsed
          }))
        }
      }
    }
  })

  const ldapUnbind = util.promisify(ldapClient.unbind).bind(ldapClient)
  await ldapUnbind()
}

async function getFilteredErrors (apiUrl, apiKey, from, ugUrl, ugUsername, ugPwd, callback, options = {}) {
  const log = options.log || console
  log.warn('The function "getFilteredErrors" is deprecated. Please use "traverseErrors" instead')

  const result = []
  const data = {
    canvasApiUrl: apiUrl,
    canvasApiToken: apiKey,
    ugUrl: ugUrl,
    ugUsername: ugUsername,
    ugPassword: ugPwd
  }

  result.push(
    ['sis_import_id', 'message', 'row'].join(',')
  )

  await traverseErrors(from, data, async (errors) => {
    await callback({sis_imports: [errors]})

    for (const error of errors.kth_warnings) {
      result.push(
        [errors.id, error.message, error.row].join(',')
      )
    }
  }, options)

  return result.join('\n')
}

module.exports = {
  getFilteredErrors: getFilteredErrors,
  traverseErrors
}
