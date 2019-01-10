const inquirer = require('inquirer')
const CanvasApi = require('kth-canvas-api')
require('dotenv').config()

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
  
    const canvasApi = new CanvasApi(apiUrl, apiKey)
}
search()  
