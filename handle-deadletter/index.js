require('dotenv').config()
const inquirer = require('inquirer')
const chalk = require('chalk')
const { ServiceBusClient, ServiceBusManagementClient } = require('@azure/service-bus')

async function chooseSubscription (connectionString, topic) {
  const client = new ServiceBusManagementClient(connectionString)
  const subscriptions = await client.getSubscriptions(topic)
  const { chosenSubscription } = await inquirer.prompt({
    name: 'chosenSubscription',
    message: 'Choose a topic',
    type: 'list',
    choices: subscriptions.map(t => t.subscriptionName)
  })

  return chosenSubscription
}

async function getInfo (connectionString, topic, subscription) {
  const client = new ServiceBusManagementClient(connectionString)
  const info = await client.getSubscriptionRuntimeInfo(topic, subscription)
  console.log()

  return {
    messages: parseInt(info._response.parsedBody.CountDetails['d3p1:ActiveMessageCount'], 10),
    dlq: parseInt(info._response.parsedBody.CountDetails['d3p1:DeadLetterMessageCount'], 10)
  }
}

function getReceiver (client, topic, subscription, type) {
  if (type === 'normal') {
    return client.createReceiver(topic, subscription, 'peekLock')
  } else {
    return client.createDeadLetterReceiver(topic, subscription, 'peekLock')
  }
}

async function start () {
  const connectionString = process.env.AZURE_SERVICEBUS_CONNECTION_STRING ||
    await inquirer.prompt({
      name: 'connectionString',
      message: 'Paste the connection string'
    }).then(r => r.connectionString)

  console.log('Trying to connect...')
  const topic = 'ug-infoclass-2'
  const subscription = await chooseSubscription(connectionString, topic)
  const count = await getInfo(connectionString, topic, subscription)

  const { queue } = await inquirer.prompt({
    name: 'queue',
    message: 'Which queue do you want to browse?',
    type: 'list',
    choices: [
      {
        name: `Normal queue      (${count.messages} messages)`,
        value: 'normal'
      },
      {
        name: `Dead letter queue (${count.dlq} messages)`,
        value: 'dlq'
      }
    ]
  })

  const client = new ServiceBusClient(connectionString)
  const receiver = getReceiver(client, topic, subscription, queue)

  console.log(
    'You are going to browse through messages of a queue one at a time.\n' +
    'You must discard a message before being able to see the next one in the queue'
  )

  let discardAndContinue = true
  while (discardAndContinue) {
    // Receive a message
    console.log('Receiving message...')
    const messages = await receiver.receiveMessages(1, {
      maxWaitTimeInMs: 2000
    })

    if (messages.length < 1) {
      console.log('No more messages to receive')
      break
    }

    const message = messages[0]
    console.log(message)
    const { answer } = await inquirer.prompt({
      name: 'answer',
      message: 'What to do?',
      type: 'list',
      choices: [{
        name: 'discard message and take next',
        value: true,
      },
      {
        name: 'stop browsing',
        value: false
      }]
    })

    if (answer) {
      console.log('Consuming message...')
      await message.complete()
    } else {
      console.log('Putting back message to the queue...')
      await message.abandon()
    }

    console.log('done')
    discardAndContinue = answer
  }
  console.log('Closing receiver...')
  await receiver.close()
  await client.close()

}

start()
