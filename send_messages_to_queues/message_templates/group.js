const inquirer = require('inquirer')
const randomstring = require('randomstring')

module.exports = async function () {
  const answers = await inquirer.prompt([
    {
      name: 'member',
      default: `${randomstring.generate(8)}`
    },
    {
      name: 'kthid',
      default: `${randomstring.generate(8)}`
    },
    {
      name: 'ug1Name'
    }
  ])

  return Object.assign(answers, {
    'ugClass': 'group',
    'member': [answers.member],
  })
}
