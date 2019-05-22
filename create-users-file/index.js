const ldap = require('ldapjs')
const fs = require('fs')
const fileName = '/tmp/all-ug-users.csv'
const headers = ['_user_id', '_login_id', '_email']

for (let i = 0; i < 20; i++) {
  headers.push(`alias${i}`)
}

const attributes = ['ugKthid', 'ugUsername', 'mail', 'name', 'ugAliasUsername']
const { csvFile } = require('kth-canvas-utilities')
require('dotenv').config()
try {
  fs.unlinkSync(fileName)
} catch (e) {
  console.log('couldnt delete file. It probably doesnt exist.')
}

const client = ldap.createClient({
  url: process.env.LDAP_URL
})

csvFile.writeLine(headers, fileName)

function appendUsers (type) {
  return new Promise((resolve, reject) => {
    let counter = 0

    const opts = {
      filter: `objectClass=user`,
      // filter: 'uid=u12qczw2',
      scope: 'sub',
      paged: true,
      sizeLimit: 1000,
      attributes
    }
    client.search('OU=UG,DC=UG,DC=kth,DC=se', opts, function (err, res) {
      // client.search('OU=UG,DC=ref,DC=UG,DC=kth,DC=se', opts, function (err, res) {
      if (err) {
        throw err
      }
      res.on('searchEntry', function (entry) {
        // console.log(entry.object)
        counter++
        // console.log(entry.object)
        // console.log('.')
        const o = entry.object
        const userName = `${o.ugUsername}@kth.se`
        const line = [o.ugKthid, userName, o.mail]
        if (o.ugAliasUsername) {
          if (Array.isArray(o.ugAliasUsername)) {
            o.ugAliasUsername.forEach(alias => line.push(alias))
          } else {
            line.push(o.ugAliasUsername)
          }
        }

        csvFile.writeLine(line, fileName)
      })
      res.on('error', function (err) {
        console.error('error: ' + err.message)
      })
      res.on('end', function (result) {
        console.log('Done with ', type, counter)
        resolve()
      })
    })
  })
}

client.bind(process.env.LDAP_USER, process.env.LDAP_PWD, function (err) {
  if (err) {
    throw err
  }

  appendUsers()
    .then(result => client.unbind())
    .then(() => console.log('Done with creating the file', fileName))
})
