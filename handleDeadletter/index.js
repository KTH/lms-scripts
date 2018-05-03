const {Client: AMQPClient, Policy} = require('amqp10')
const urlencode = require('urlencode')
const inquirer = require('inquirer')

async function connectAndHandle () {
  try {
    const {action} = await inquirer.prompt(
      {
        message: 'Vad vill du göra?',
        name: 'action',
        choices: [
          {name: 'Bara läsa meddelanden', value: 'read'},
          {name: 'Läsa meddelanden och rensa kön', value: 'delete'}
        ],
        type: 'list'
      })

    const {queue} = await inquirer.prompt(
      {
        message: 'Vilken miljö?',
        name: 'queue',
        choices: [
          {name: 'canvas-prod', value: {name: `ug-infoclass-2/Subscriptions/canvas-prod/$DeadLetterQueue`, shortName: 'canvas-prod'}},
          {name: 'canvas-ref', value: {name: `ug-infoclass-2/Subscriptions/canvas-ref/$DeadLetterQueue`, shortName: 'canvas-ref'}}
        ],
        type: 'list'
      })

    const {sharedAccessKey} = await inquirer.prompt({
      message: `Klistra in en access key till ${queue.shortName} i Azure. Den finns här: https://tinyurl.com/ydfquezj`,
      name: 'sharedAccessKey'
    })

    const client = await new AMQPClient(Policy.Utils.RenewOnSettle(1, 1, Policy.ServiceBusQueue))
    await client.connect(`amqps://${queue.shortName}:${urlencode(sharedAccessKey)}@kth-integral.servicebus.windows.net`)
    const receiver = await client.createReceiver(queue.name)
    console.log('receiver created:', receiver.id)

    receiver.on('message', message => {
      console.log('new message', JSON.stringify(message, null, 4))
      if (action === 'delete') {
        receiver.accept(message)
      } else {
        receiver.release(message)
      }
    })
  } catch (e) {
    console.error('error:', e)
  }
}

connectAndHandle()
