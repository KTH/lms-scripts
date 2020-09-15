const got = require('got')

function removeSSL (err) {
  delete err.gotOptions
  return err
}

module.exports = function LadokApi (baseUrl, ssl, options = {}) {
  if (!ssl) {
    throw new TypeError('LadokApi requires at least 2 arguments')
  }

  if (!ssl.pfx && !(ssl.cert && ssl.key)) {
    throw new TypeError('Second argument "ssl" must have either "pfx" property or both "cert" and "key"')
  }

  const ladokGot = got.extend({
    baseUrl,
    json: true,
    pfx: ssl.pfx,
    cert: ssl.cert,
    key: ssl.key,
    passphrase: ssl.passphrase
  })

  const log = options.log || (() => {})

  async function test () {
    log(`GET /kataloginformation/anvandare/autentiserad`)
    try {
      const response = await ladokGot('/kataloginformation/anvandare/autentiserad', {
        headers: {
          'Accept': 'application/vnd.ladok-kataloginformation+json'
        }
      })

      return response
    } catch (e) {
      throw removeSSL(e)
    }
  }

  async function requestUrl (endpoint, method = 'GET', body, attributes) {
    log(`${method} ${endpoint}`)

    try {
      const response = await ladokGot(endpoint, {
        json: true,
        body,
        method,
        ...attributes
      })

      return response
    } catch (e) {
      throw removeSSL(e)
    }
  }

  return {
    test,
    requestUrl
  }
}
