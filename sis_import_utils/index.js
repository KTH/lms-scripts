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

/** Converts a warning "string" into a object with data */
async function parseWarning (message = '', data = {}, options = {}) {
  const log = options.log || console
  let is_known_warning = false

  // Get UserID, sectionID, courseID from "message"
  const sectionId = (message.match(/Section ID: (\w+)/) || [])[1]
  const userId = (message.match(/User ID: (\w+)/) || [])[1]
  const courseId = (message.match(/User ID: (\w+)/) || [])[1]

  isKnownWarning =
    !message
    message.includes('Neither course nor section existed') ||
    message.includes('Neither course nor section existed') ||
    !/There were [\d,]+ more warnings/.test(message)

  if (!isKnownWarning && message.includes('User not found')) {
    const ugUrl = data.ugUrl || process.env.UG_URL
    const ugUsername = data.ugUsername || process.env.UG_USERNAME
    const ugPassword = data.ugPassword || process.env.UG_PASSWORD

    const ldapClient = ldap.createClient({ url: ugUrl })
    const ldapBind = util.promisify(ldapClient.bind).bind(ldapClient)
    const ldapUnbind = util.promisify(ldapClient.unbind).bind(ldapClient)
    let userInfo
    try {
      await ldapBind(ugUsername, ugPassword)
      userInfo = await getUserInfo(userId, ldapClient)

    } catch (err) {
      log.error(err, 'Error in LDAP')
    } finally {
      await ldapUnbind()
    }

    const mOf = userInfo && userInfo[0] && userInfo[0].memberOf && userInfo[0].memberOf
    const ugPA = userInfo && userInfo[0] && userInfo[0].ugPrimaryAffiliation

    if (mOf && mOf.find && mOf.find(i => i.includes('CN=pa.stipendiater'))) {
      isKnownWarning = true
    }

    if (ugPA === 'other') {
      isKnownWarning = true
    }

  }

  return {
    message,
    is_known_warning: isKnownWarning,
    user_id: userId,
    course_id: courseId,
    section_id: sectionId
  }
}

async function traverseErrors (from, data, callback, options = {}) {
  const log = options.log || console
  const canvasApiUrl = data.canvasApiUrl || process.env.CANVAS_API_URL
  const canvasApiToken = data.canvasApiToken || process.env.CANVAS_API_TOKEN

  const canvasApi = new CanvasApi(canvasApiUrl, canvasApiToken)
  canvasApi.logger = log

  await canvasApi.get(`/accounts/1/sis_imports?created_since=${from}&per_page=100`, async page => {
    for (const sisImport of page.sis_imports) {
      if (sisImport.errors_attachment && sisImport.errors_attachment.url) {
        const warnings = await (
          request({
            uri: sisImport.errors_attachment.url,
            headers: {'Connection': 'keep-alive'}
          })
          .then(result => papaparse.parse(result, {header: true}).data)
          .then(result => result.filter(w => w.message))
        )
        const parsed = []

        for (const w of warnings) {
          const pw = await parseWarning(w.message, data, options)
          parsed.push(pw)
        }

        // Filter some of them
        const kth_warnings = parsed
          .filter(pw => !pw.is_known_warning)

        if (parsed.length > 0) {
          callback(Object.assign(sisImport, {
            kth_warnings
          }))
        }
      }
    }
  })
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
        [errors.id, error.warning.message, error.row].join(',')
      )
    }
  }, options)

  return result.join('\n')
}

module.exports = {
  getFilteredErrors: getFilteredErrors,
  traverseErrors
}
