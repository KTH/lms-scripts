const ldap = require('ldapjs')
const fs = require('fs')
const fileName = '/tmp/all-ug-users.csv'
const headers = ['user_id', 'login_id', 'email','short_name','sortable_name','status']
const attributes = ['ugKthid', 'ugUsername', 'mail', 'email_address','givenName', 'sn' , 'name', 'ugEmailAddressHR']
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
      filter: `ugAffiliation=${type}`,
      scope: 'sub',
      paged: true,
      sizeLimit: 1000,
      attributes
    }

    client.search('OU=UG,DC=ug,DC=kth,DC=se', opts, function (err, res) {
      if (err) {
        throw err
      }
      res.on('searchEntry', function (entry) {
        counter++
        const o = entry.object
        const userName = `${o.ugUsername}@kth.se`
        csvFile.writeLine([o.ugKthid, userName, o.mail,,`${o.sn}, ${o.givenName}`, 'active'], fileName)
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

client.bind(process.env.LDAP_USERNAME, process.env.LDAP_PASSWORD, function (err) {
  if (err) {
    throw err
  }

    appendUsers('member')
    .then(result => client.unbind())
    .then(() => console.log('Done with creating the file', fileName))
})