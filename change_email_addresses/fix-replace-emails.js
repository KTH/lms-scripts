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

        const url = `users/${canvasUserId}/communication_channels`
        const commChannels = await canvasApi.get(url)
        // THe user should only have one email channel, but double check anyway
        const emailCommChannels = commChannels.filter(channel => channel.type === 'email')
        if(emailCommChannels.length != 1){
            console.error('The user has wrong number of email communication channels!', line)
            process.exit()
        }
        console.log('----------------')
        const [communication_channel] = emailCommChannels

        // Step one: delete the old email communication channel, since it's not possible to update them through the api
        await canvasApi.requestUrl( `${url}/${communication_channel.id}`, 'DELETE' )
        await canvasApi.requestUrl(
            `users/${canvasUserId}/communication_channels`,
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
        process.exit()
        //await canvasApi.requestUrl(`users/${canvasUserId}/communication_channels/`)

    }
}
update()
