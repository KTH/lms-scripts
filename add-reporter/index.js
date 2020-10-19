require('dotenv').config()
const got = require('got')
const inquirer = require('inquirer')
const chalk = require('chalk')
const organisations = require('./organisations')
const fs = require('fs')
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

const ladokGot = got.extend({
  baseUrl: process.env.LADOK_API_BASEURL,
  pfx: fs.readFileSync('./certificate.pfx'),
  // pfx: Buffer.from(process.env.LADOK_API_PFX_BASE64, 'base64'),
  passphrase: process.env.LADOK_API_PFX_PASSPHRASE,
  json: true
})

async function start () {
  const { body: authenticatedUser } = await ladokGot('kataloginformation/anvandare/autentiserad', {
    headers: {
      'Accept': 'application/vnd.ladok-kataloginformation+json'
    }
  })
  console.log(`You are: ${chalk.bold(authenticatedUser.Anvandarnamn)} - UID: ${authenticatedUser.Uid}`)

  const { body: allUsersBody } = await ladokGot('/kataloginformation/anvandare/filtrerade', {
    headers: {
      'Accept': 'application/vnd.ladok-kataloginformation+json'
    }
  })

  const allUsers = allUsersBody.Anvandare
  const { selectedUsername } = await inquirer.prompt({
    name: 'selectedUsername',
    message: 'Write the name of the user do you want to add permissions (e.g. "kaj@kth.se")',
    type: 'autocomplete',
    source: function (_, input) {
      if (!input) {
        return allUsers.map(user => user.Anvandarnamn)
      }

      return allUsers
        .map(user => user.Anvandarnamn)
        .filter(username => username.startsWith(input))
    }
  })
  const selectedUser = allUsers.find(user => user.Anvandarnamn === selectedUsername)

  if (!selectedUser) {
    console.log('User not found')
    return
  }

  console.log()
  console.log(`${chalk.yellow('Caution!')} You are running this script towards ${chalk.bold(process.env.LADOK_API_BASEURL)}`)
  console.log(`You are going to add permissions to the user is ${selectedUser.Anvandarnamn} - UID ${selectedUser.Uid}`)
  const { answer } = await inquirer.prompt({
    name: 'answer',
    type: 'confirm',
    message: 'Are you sure?'
  })

  if (answer) {
    const SkapaOrganisationsrattighet = organisations.Organisationer.map(org => ({
      'AnvandareUID': selectedUser.Uid,
      'Informationsbehorighetsavgransningar': [],
      'OrganisationUID': org.Uid,
      'RattighetenAvser': 'HEL_KURS_OCH_MODUL_RESULTAT'
    }))

    await ladokGot.post('/resultat/resultatrattighet/organisation/rapportor', {
      body: { SkapaOrganisationsrattighet }
    })

    console.log('Done!!')
  }

}

start().catch(e => {
  console.error(e)
})
