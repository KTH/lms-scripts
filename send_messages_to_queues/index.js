const getQueue = require('./getQueue')
const inquirer = require('inquirer')

async function start () {
  const queue = await getQueue()

  let sendMoreMessages = true
  do {
    await inquirer.prompt({
      name: '42',
      message: 'Hit enter to send a message'
    })

    try {
      await queue.send({body: 'this is a message'})
    } catch (err) {
      console.error('Error sending a message')
      console.error(err)
    }

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
