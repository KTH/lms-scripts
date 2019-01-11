const inquirer = require('inquirer')
const CanvasApi = require('kth-canvas-api')
require('dotenv').config()
require('colors')
const {promisify} = require('util')

const rp = promisify(require('request'))


async function search(){

    const apiUrl = process.env.CANVAS_API_URL || (await inquirer.prompt(
        {
            message: 'Vilken miljö?',
            name: 'api',
            choices: [
                {name: 'test', value: {apiUrl: 'https://kth.test.instructure.com/api/v1'}},
                {name: 'prod', value: {apiUrl: 'https://kth.instructure.com/api/v1'}},
                {name: 'beta', value: {apiUrl: 'https://kth.beta.instructure.com/api/v1'}}
            ],
            type: 'list'
        })).api

    const apiKey = process.env.CANVAS_API_KEY || await (inquirer.prompt({
        message: 'Klistra in api nyckel till Canvas här',
        name: 'apiKey',
        type: 'string'
    })).apiKey

    const {searchString} = await inquirer.prompt({
        name: 'searchString',
        message: 'Vad vill du söka efter? Skriv req exp här',
        type: 'string'
    })
    const re = new RegExp(searchString)

    const canvasApi = new CanvasApi(apiUrl, apiKey)
    canvasApi.get('accounts/1/sis_imports', async data =>{
        //console.log(JSON.stringify(data,null,4) ) 
        for (const sis of data.sis_imports) {
            const url = sis.csv_attachments && sis.csv_attachments[0].url 
            if(url){
                const {body} = await rp({
                    url,
                    auth: {
                        'bearer': apiKey
                    },
                    resolveWithFullResponse: true,
                    method: 'GET'
                })
                if( re.exec( body ) ){
                    console.log(`Found match in ${JSON.stringify(sis)}`.green)
                    console.log(body.green)
                }

            }
        }
    } )
}
search()  
