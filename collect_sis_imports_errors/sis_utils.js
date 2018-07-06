const CanvasApi = require('kth-canvas-api')
const ldap = require('ldapjs')
const util = require('util')
const request = require('request-promise')

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
  return userInfo[0].memberOf.find((item) => {
    return item.includes('CN=pa.stipendiater')
  }) !== undefined || userInfo[0].ugPrimaryAffiliation === 'other'
}

async function getFilteredErrors (apiUrl, apiKey, from, ugUrl, ugUsername, ugPwd) {
  const canvasApi = new CanvasApi(apiUrl, apiKey)

  const allSisImports = await canvasApi.get(`/accounts/1/sis_imports?created_since=${from}&per_page=100`)

  const flattenedSisImports = allSisImports
    .reduce((a, b) => a.concat(b.sis_imports), []) // Flatten every page

  const reportUrls = flattenedSisImports.map(_sisObj => (_sisObj.errors_attachment && _sisObj.errors_attachment.url) || [])
    .reduce((a, b) => a.concat(b), [])

  const ldapClient = ldap.createClient({
    url: ugUrl
  })
  const ldapClientBindAsync = util.promisify(ldapClient.bind).bind(ldapClient)
  await ldapClientBindAsync(ugUsername, ugPwd)
  let logString = ''
  logString += 'Searching for warnings and errors:\n'
  logString += 'sis_import_id,file,message,row\n'
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
          const stipendiatOrOther = await isUserStipendiatOrOther(userId, ldapClient)
          if (!stipendiatOrOther) {
            logString += `${item}\n`
          }
        } else {
          logString += `${item}\n`
        }
      }
    }
  }
  const ldapClientUnbindAsync = util.promisify(ldapClient.unbind).bind(ldapClient)
  await ldapClientUnbindAsync()
  return logString
}

module.exports = {
  getFilteredErrors
}
