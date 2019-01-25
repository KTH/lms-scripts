const fs = require('fs')
const CanvasApi = require('kth-canvas-api')
require('dotenv').config()
const canvasApi = new CanvasApi(process.env.CANVAS_API_URL,process.env.CANVAS_API_KEY )

const csvLines = fs.readFileSync('case-1-replace-addresses.csv', 'utf8')
    .toString()
    .split('\n')

async function update() {
    for (const line of csvLines) {
        console.log('----------------')
        const [canvasUserId,,ugEmail] = line.split(',')


        if(  canvasUserId === 'canvas_id') continue // skip headers
        if(  !canvasUserId ) continue // Ignore empty lines

        const url = `users/${canvasUserId}/communication_channels`
        const commChannels = await canvasApi.get(url)
        const emailCommChannels = commChannels.filter(channel => channel.type === 'email')
        
        // THe user should only have one email channel, but double check anyway
        if(emailCommChannels.length != 1){
            console.error('The user has wrong number of email communication channels!', line)
            process.exit()
        }
        const [communication_channel] = emailCommChannels

        // Step one: delete the old email communication channel, since it's not possible to update them through the api
        await canvasApi.requestUrl( `${url}/${communication_channel.id}`, 'DELETE' )

        // ... and then create a new one with the correct email address
        await canvasApi.requestUrl(
            url,
            'POST',
            {
                communication_channel:{
                    type: 'email',
                    address: ugEmail 
                }
                ,skip_confirmation:true
            }

        )
        console.log('done with updating the user with canvas id', canvasUserId)
    }
    console.log('done :)')
}
update()
