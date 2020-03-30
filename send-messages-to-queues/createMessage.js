const inquirer = require('inquirer')

module.exports = async function createMessage () {
  const {template} = await inquirer.prompt({
    message: 'Choose a template',
    name: 'template',
    type: 'list',
    choices: ['user', 'group']
  })

  return {
    user: require('./message_templates/user'),
    group: require('./message_templates/group')
  }[template]()
}
