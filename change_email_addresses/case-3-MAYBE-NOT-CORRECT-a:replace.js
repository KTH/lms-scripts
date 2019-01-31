const fs = require('fs')
const CanvasApi = require('kth-canvas-api')
require('dotenv').config()
const canvasApi = new CanvasApi(process.env.CANVAS_API_URL,process.env.CANVAS_API_KEY )

const csvLines = fs.readFileSync('case-3-MAYBE-NOT-CORRECT-a:replace.csv', 'utf8')
    .toString()
    .split('\n')

async function update() {
    for (const line of csvLines) {
        console.log('----------------', line)
        const [canvasUserId,sis_user_id,canvasEmail] = line.split(',')

        if(  canvasUserId === 'canvas_id') continue // skip headers
        if(  !canvasUserId ) continue // Ignore empty lines

        const url = `users/${canvasUserId}/communication_channels`
        const commChannels = await canvasApi.get(url)
        const emailCommChannels = commChannels.filter(channel => channel.type === 'email' && channel.address === )
        
        // THe user should only have one email channel, but double check anyway
        //const [communication_channel] = emailCommChannels
        console.log(emailCommChannels)
        // Step one: delete the old email communication channel, since it's not possible to update them through the api
        /*await canvasApi.requestUrl( `${url}/${communication_channel.id}`, 'DELETE' )

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

        )*/
        console.log('done with updating the user with canvas id', canvasUserId)
    }
    console.log('done :)')
}
update()
