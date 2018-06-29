const getQueue = require('./getQueue')
const inquirer = require('inquirer')

async function start() {
  const queue = await getQueue()

  let sendMoreMessages = true
  do {
    queue.send({body: 'this is a message'})

    const response = await inquirer.prompt({
      message: 'Do you want to send more messages?',
      name: 'sendMoreMessages',
      type: 'list',
      choices: [
        {value: true,  name: 'Yes'},
        {value: false, name: 'No'}
      ]
    })
    sendMoreMessages = response.sendMoreMessages
  } while (sendMoreMessages)
}

start();
