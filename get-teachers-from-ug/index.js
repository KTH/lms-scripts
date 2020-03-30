require('dotenv').config()
const { Client } = require('ldapts')
const fs = require('fs')

async function ldapSearch ({
  base = 'OU=UG,DC=ug,DC=kth,DC=se',
  filter = '',
  attributes = [],
  scope = 'sub'
}) {
  let ldapClient
  try {
    ldapClient = new Client({
      url: process.env.UG_URL
    })
    await ldapClient.bind(process.env.UG_USERNAME, process.env.UG_PASSWORD)

    const options = {
      scope,
      filter,
      attributes
    }

    const { searchEntries } = await ldapClient.search(base, options)
    return searchEntries
  } catch (err) {
    err.message = 'Error in LPDAP: ' + err.message
    throw err
  } finally {
    await ldapClient.unbind()
  }
}

async function start () {
  const filePath = './teachers.csv'
  const writeHeaders = headers => fs.writeFileSync(filePath, headers.join(',') + '\n')
  const writeContent = content => fs.appendFileSync(filePath, content.join(',') + '\n')

  writeHeaders([
    'Account',
    'Surname',
    'Given name',
    'E-mail'
  ])

  const groups = await ldapSearch({
    filter: '(&(objectClass=group)(CN=edu.school.*))',
    attributes: []
  })

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]
    console.log(`Group ${i+1}/${groups.length}. ${group.name}`)

    if (!group.member) {
      continue
    }

    const people = Array.isArray(group.member)
      ? group.member
      : [group.member]

    for (let j = 0; j < people.length; j++) {
      const dn = people[j]
      const person = await ldapSearch({ base: dn, scope: 'base', attributes: ['sn', 'givenName', 'mail', 'ugUsername'] })

      console.log(`${group.name}. ${j+1}/${people.length}. ${person[0].mail}`)

      writeContent([
        `${person[0].ugUsername}@kth.se`,
        person[0].sn,
        person[0].givenName,
        person[0].mail,
      ])
    }
  }
}

start()
