const azureSb = require('azure-sb')
const azureStorage = require('azure-storage')
const inquirer = require('inquirer')

async function createServiceBusService (connectionString) {
  if (!connectionString) {
    const {host} = await inquirer.prompt({
      message: 'Paste the AZURE_HOST',
      name: 'host',
      type: 'string',
      default: 'lms-queue.servicebus.windows.net'
    })

    const {sharedAccessKeyName} = await inquirer.prompt({
      message: 'Paste the AZURE_SHARED_ACCESS_KEY_NAME',
      name: 'sharedAccessKeyName',
      type: 'string',
      default: 'RootManageSharedAccessKey'
    })

    const {sharedAccessKey} = await inquirer.prompt({
      message: 'Paste the AZURE_SHARED_ACCESS_KEY',
      name: 'sharedAccessKey',
      type: 'string'
    })

    connectionString = [
      `Endpoint=sb://${host}`,
      `SharedAccessKeyName=${sharedAccessKeyName}`,
      `SharedAccessKey=${sharedAccessKey}`
    ].join(';')
  }

  try {
    return azureSb.createServiceBusService(connectionString)
  } catch (err) {
    if (err.name === 'NoMatchError') {
      console.error('Cannot connect to Azure ServiceBus. Some arguments are missing.')
      process.exit(1)
    }
  }
}

async function getStorageQueue () {
  const queueService = azureStorage
    .createQueueService('UseDevelopmentStorage=true')

  const {queueName} = await inquirer.prompt({
    message: 'Write the name of the queue',
    name: 'queueName',
    type: 'string',
    default: 'hello-world'
  })

  try {
    await new Promise((accept, reject) => {
      queueService.createQueueIfNotExists(queueName, (error, results, response) => {
        if (!error) {
          accept(response)
        } else {
          reject(error)
        }
      })
    })
  } catch (err) {
    if (err.name === 'ArgumentError') {
      console.error('Error in the name of the queue:', err.message)
      process.exit(1)
    } else if (err.errno === 'ECONNREFUSED') {
      console.error(`Cannot connect to ${err.address}:${err.port}.`)
      console.error('Make sure that the local emulator is running.')
      process.exit(1)
    } else {
      throw err
    }
  }

  return {
    send (message) {
      return new Promise((accept, reject) => {
        queueService.createMessage(queueName, Buffer.from(JSON.stringify(message)).toString("base64"), (error, results, response) => {
          error ? reject(error) : accept(response)
        })
      })
    }
  }
}

async function getServiceBusQueue () {
  const serviceBusService = await createServiceBusService(process.env.AZURE_QUEUE_CONNECTION_STRING)

  const {queueName} = process.env.AZURE_QUEUE_NAME ? {queueName: process.env.AZURE_QUEUE_NAME} :  await inquirer.prompt({
    message: 'AZURE_QUEUE_NAME',
    name: 'queueName',
    type: 'string'
  })

  try {
    await new Promise ((accept, reject) => {
      serviceBusService.getQueue(queueName, (error, results, response) => {
        if (!error) {
          accept(response)
        } else {
          reject(error)
        }
      })
    })
  } catch (err) {
    if (err.name === 'Error' && err.code === 'QueueNotFound') {
      console.error('Wrong AZURE_QUEUE_NAME. That queue does not exist')
      process.exit(1)
    } else if (err.name === 'Error' && err.code === '401') {
      console.error('Wrong AZURE_SHARED_ACCESS_KEY')
      process.exit(1)
    } else if (err.name === 'Error') {
      console.error('Error connecting to the queue: ', err.message)
      console.error(err)
      process.exit(1)
    }

    throw err
  }

  return {
    send (message) {
      return new Promise((accept, reject) => {
        serviceBusService.sendQueueMessage(queueName, {body: JSON.stringify(message)}, (error) => {
          error ? reject(error) : accept()
        })
      })
    }
  }
}

async function getServiceBusTopic () {
  const serviceBusService = await createServiceBusService(process.env.AZURE_TOPIC_CONNECTION_STRING)

  const {topicName} = process.env.AZURE_TOPIC_NAME ? {topicName: process.env.AZURE_TOPIC_NAME} : await inquirer.prompt({
    message: 'AZURE_TOPIC_NAME',
    name: 'topicName',
    type: 'string'
  })

  return {
    send (message) {
      return new Promise((accept, reject) => {
        serviceBusService.sendTopicMessage(topicName, {body: JSON.stringify(message)}, error => {
          error ? reject(error) : accept()
        })
      })
    }
  }
}



module.exports = async function getQueue () {
  const {queueType} = await inquirer.prompt({
    message: 'What type of queue do you want to work?',
    name: 'queueType',
    type: 'list',
    choices: [
      {value: 'storage', name: 'Queue in local (Azure Storage Queue Emulator)'},
      {value: 'serviceBusQueue', name: 'Queue in the cloud (Azure Service Bus Queue)'},
      {value: 'serviceBusTopic', name: 'Topic in the cloud (Azure Service Bus Topic)'}
    ]
  })

  return await {
    storage: getStorageQueue,
    serviceBusQueue: getServiceBusQueue,
    serviceBusTopic: getServiceBusTopic
  }[queueType]()
}
