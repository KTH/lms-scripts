require('dotenv').config()
const azureSb = require('azure-sb')
const serviceBusUrl = 'lms-queue.servicebus.windows.net'
const topicName = 'lms-topic-emil2'
const subName= 'lms-sub-emil2'

const sBConnectionString = `Endpoint=sb://lms-queue.servicebus.windows.net/;SharedAccessKeyName=${process.env.AZURE_SHARED_ACCESS_KEY_NAME};SharedAccessKey=${process.env.AZURE_SHARED_ACCESS_KEY}`
const sBService = azureSb.createServiceBusService(sBConnectionString)

async function start () {

    const message = {body: JSON.stringify({foo:1})}

    try {
return new Promise((resolve, reject) => {
        sBService.sendTopicMessage(topicName, message, (err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
    } catch (err) {
      console.error('Error sending a message')
      console.error(err)
    }

    console.log(message)
    console.log('message sent')

}

start()
  .catch(err => {
    console.error('Unhandled error')
    console.error(err)
  })
