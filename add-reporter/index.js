require('dotenv').config()
const Ladok = require('./ladok-api')
const inquirer = require('inquirer')
const chalk = require('chalk')
const organisations = require('./organisations')

async function addPermission (ladok, anvandareUID) {
  const SkapaOrganisationsrattighet = organisations.Organisationer.map(org => ({
    'AnvandareUID': anvandareUID,
    'Informationsbehorighetsavgransningar': [],
    'OrganisationUID': org.Uid,
    'RattighetenAvser': 'HEL_KURS_OCH_MODUL_RESULTAT'
  }))

  await ladok.requestUrl('/resultat/resultatrattighet/organisation/rapportor', 'POST', {
    SkapaOrganisationsrattighet
  })
}

async function removePermission (ladok, rattighet) {
  await ladok.requestUrl(`/resultat/resultatrattighet/${rattighet.Uid}`, 'DELETE')
}

async function start () {
  const ladok = Ladok(
    process.env.LADOK_API_BASEURL,
    {
      // pfx: fs.readFileSync('./certificate.pfx'),
      pfx: Buffer.from(process.env.LADOK_API_PFX_BASE64, 'base64'),
      passphrase: process.env.LADOK_API_PFX_PASSPHRASE
    }
  )

  console.log(`${chalk.yellow('Caution!')} You are running this script towards ${chalk.bold(process.env.LADOK_API_BASEURL)}`)

  const result = await ladok.test()

  console.log(result.body.Uid)
  const { anvandareUID } = await inquirer.prompt({
    message: 'Write the Användare UID. This is the user you want to add behörigheter to (systemanvändaren)',
    name: 'anvandareUID',
    type: 'input',
    default: result.body.Uid
  })

  while (true) {
    const { body: rights } = await ladok.requestUrl('/resultat/resultatrattighet/resultatrattighet/rapportor/sok', 'PUT', {
      'AnvandareUID': anvandareUID,
      'Limit': 100,
      'Page': 1,
      'Medarbetartyp': 'RAPPORTOR'
    })

    const options = [
      { name: 'Add new permission', value: 'add' },
      new inquirer.Separator(),
      ...rights.Resultat.map(r => ({
        name: 'Delete for org.' + r.Benamning,
        value: r
      }))
    ]

    const { chosenOption } = await inquirer.prompt({
      type: 'list',
      message: 'What do you want to do? (Ctrl-C to exit)',
      name: 'chosenOption',
      choices: options
    })

    if (chosenOption === 'add') {
      await addPermission(ladok, anvandareUID)
    } else {
      await removePermission(ladok, chosenOption)
    }
  }
}

start().catch(e => {
  console.error(e)
})
