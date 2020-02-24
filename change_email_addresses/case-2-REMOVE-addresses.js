const fs = require('fs')
const CanvasApi = require('kth-canvas-api')
require('dotenv').config()
const canvasApi = new CanvasApi(process.env.CANVAS_API_URL, process.env.CANVAS_API_KEY)

const csvLines = fs.readFileSync('case-2-REMOVE-addresses.csv', 'utf8')
  .toString()
  .split('\n')

async function update () {
  for (const line of csvLines) {
    console.log('----------------', line)
    const [canvasUserId, sisUserId, removeAddress] = line.split(',') // eslint-disable-line

    if (canvasUserId === 'canvas_id') continue // skip headers
    if (!canvasUserId) continue // Ignore empty lines

    const url = `users/${canvasUserId}/communication_channels`
    const commChannels = await canvasApi.get(url)
    const emailCommChannels = commChannels.filter(channel => channel.type === 'email')

    // The user should have more then one email channel, but double check anyway
    if (emailCommChannels.length <= 1) {
      console.error('The user has wrong number of email communication channels!', emailCommChannels.length)
      console.error('Manually check this user to make sure it is ok.', url)
    } else {
      const removeChannel = emailCommChannels.find(channel => channel.address === removeAddress)
      if (!removeChannel) {
        console.error('Could not find the incorrect email adress. Manually check this user to make sure it is ok.', url)
      } else {
        console.log('About to remove the communication channel', removeChannel)
        await canvasApi.requestUrl(`${url}/${removeChannel.id}`, 'DELETE')
      }
    }
  }
  console.log('done :)')
}
update()
