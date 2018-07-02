const getQueue = require('./getQueue')
const createMessage = require('./createMessage')
const inquirer = require('inquirer')

async function start () {
  const queue = await getQueue()

  let sendMoreMessages = true
  do {
    const message = await createMessage()

    try {
      await queue.send(message)
    } catch (err) {
      console.error('Error sending a message')
      console.error(err)
    }

    console.log(message)
    console.log('message sent')

    const response = await inquirer.prompt({
      message: 'Do you want to send more messages?',
      name: 'sendMoreMessages',
      type: 'list',
      choices: [
        {value: true, name: 'Yes'},
        {value: false, name: 'No'}
      ]
    })
    sendMoreMessages = response.sendMoreMessages
  } while (sendMoreMessages)
}

start()
  .catch(err => {
    console.error('Unhandled error')
    console.error(err)
  })
