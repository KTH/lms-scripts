const fs = require('fs')
const CanvasApi = require('kth-canvas-api')
require('dotenv').config()
const canvasApi = new CanvasApi(process.env.CANVAS_API_URL,process.env.CANVAS_API_KEY )

const csvLines = fs.readFileSync('case-1-replace-addresses.csv', 'utf8')
    .toString()
    .split('\n')

async function update() {
    for (const line of csvLines) {
        const [canvasUserId,,ugEmail] = line.split(',')
        if(canvasUserId === 'canvas_id') continue
        console.log(canvasUserId, ugEmail)

        const commChannels = await canvasApi.get(`users/${canvasUserId}/communication_channels`)
        console.log(commChannels)
        // THe user should only have one email channel, but double check anyway
        if(commChannels.filter(channel => channel.type === 'email').length != 1){
            console.error('The user has wrong number of email communication channels!', line)
            process.exit()
        }
        
    }
}
update()
