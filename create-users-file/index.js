const ldap = require('ldapjs')
const fs = require('fs')
const fileName = 'allUsers.csv'
const headers = ['user_id', 'login_id', 'full_name', 'status']
const attributes = ['ugKthid', 'ugUsername', 'mail', 'email_address', 'name', 'ugEmailAddressHR']
const {csvFile} = require('kth-canvas-utilities')
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
      scope: 'sub',
      paged: true,
      sizeLimit: 1000,
      attributes
    }
    client.search('OU=UG,DC=ref,DC=UG,DC=kth,DC=se', opts, function (err, res) {
      if (err) {
        throw err
      }
      res.on('searchEntry', function (entry) {
          console.log(entry.object)
        counter++
        // console.log(entry.object)
        // console.log('.')
        const o = entry.object
        const userName = `${o.ugUsername}@kth.se`
        csvFile.writeLine([o.ugKthid, userName, o.name, 'active'], fileName)
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
