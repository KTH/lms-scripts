const inquirer = require('inquirer')
const randomstring = require('randomstring')
const faker = require('faker/locale/sv')

module.exports = async function () {
  const answers = await inquirer.prompt([
    {
      name: 'kthid',
      default: `${randomstring.generate(8)}`
    },
    {
      name: 'username',
      default: `${randomstring.generate(8)}_abc`
    },
    {
      name: 'family_name',
      default: faker.name.lastName()
    },
    {
      name: 'given_name',
      default: faker.name.firstName()
    },
    {
      name: 'primary_email',
      default: faker.internet.email()
    },
    {
      name: 'affiliation',
      type: 'list',
      choices: ['student', 'member']
    }
  ])

  return Object.assign(answers, {
    'ugClass': 'user',
    'deleted': false,
    'affiliation': [answers.affiliation]
  })
}
