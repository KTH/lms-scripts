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

    const {serviceBus} = await inquirer.prompt(
      {
        message: 'Vilken Service Bus?',
        name: 'serviceBus',
        choices: [
          {name: 'kth-integral', value: {name: 'kth-integral.servicebus.windows.net', shortName: 'kth-integral'}},
          {name: 'lms-queue', value: {name: 'lms-queue.servicebus.windows.net', shortName: 'lms-queue'}}
        ],
        type: 'list'
      })
    let subscription
    if (serviceBus.name === 'kth-integral') {
      ({subscription} = await inquirer.prompt(
        {
          message: 'Vilken Subscription?',
          name: 'subscription',
          choices: [
            {name: 'canvas-prod', value: {name: `ug-infoclass-2/Subscriptions/canvas-prod/$DeadLetterQueue`, shortName: 'canvas-prod', keyName: 'canvas-prod'}},
            {name: 'canvas-ref', value: {name: `ug-infoclass-2/Subscriptions/canvas-ref/$DeadLetterQueue`, shortName: 'canvas-ref', keyName: 'canvas-ref'}}
          ],
          type: 'list'
        }))
    } else {
      ({subscription} = await inquirer.prompt(
        {
          message: 'Vilken Subscription?',
          name: 'subscription',
          choices: [
            {name: 'lms-sub-peter', value: {name: `lms-topic-peter/Subscriptions/lms-sub-peter/$DeadLetterQueue`, shortName: 'lms-sub-peter', keyName: 'lms-sub-peter-policy'}}
          ],
          type: 'list'
        }))
    }
    console.log(subscription)

    const {sharedAccessKey} = await inquirer.prompt({
      message: `Klistra in en access key till ${subscription.shortName} i Azure. Den kan tex finnas här: https://tinyurl.com/ydfquezj`,
      name: 'sharedAccessKey'
    })

    const client = await new AMQPClient(Policy.Utils.RenewOnSettle(1, 1, Policy.ServiceBusQueue))
    await client.connect(`amqps://${subscription.keyName}:${urlencode(sharedAccessKey)}@${serviceBus.name}`)
    const receiver = await client.createReceiver(subscription.name)
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
