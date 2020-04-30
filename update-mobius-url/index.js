const path = require('path')
const fs = require('fs')
const parse = require('csv-parse/lib/sync')
const got = require('got')
const inquirer = require('inquirer')
const FormData = require('form-data')

async function start () {
  const { mobiusFileName } = await inquirer.prompt({
    type: 'input',
    name: 'mobiusFileName',
    message: 'Please enter the Mobius data file name!',
    default: 'mobius-data.csv'
  })
  const input = fs.readFileSync(
    path.resolve(__dirname, mobiusFileName),
    'utf-8'
  )
  const mobiusData = parse(input, {
    columns: true,
    skip_empty_lines: true
  })

  const { canvasApiUrl } = await inquirer.prompt({
    type: 'list',
    name: 'canvasApiUrl',
    message: 'Select Canvas LMS instance!',
    choices: [
      {
        name: 'prod',
        value: 'https://canvas.kth.se/api/v1'
      },
      {
        name: 'beta',
        value: 'https://kth.beta.instructure.com/api/v1'
      }
    ]
  })
  const { canvasAccessToken } = await inquirer.prompt({
    type: 'input',
    name: 'canvasAccessToken',
    message: 'Please enter an access token to the Canvas LMS!'
  })

  const { newUrl } = await inquirer.prompt({
    type: 'input',
    name: 'newUrl',
    message: 'Please enter the new Mobius URL value!',
    default: 'https://kth.mobius.cloud:443/lti/'
  })

  const client = got.extend({
    prefixUrl: canvasApiUrl,
    headers: {
      Authorization: `Bearer ${canvasAccessToken}`
    }
  })

  for (const data of mobiusData) {
    const form = new FormData()
    form.append('assignment[external_tool_tag_attributes][url]', newUrl)
    const body = await client
      .put(`courses/${data.courseId}/assignments/${data.assignmentId}`, {
        body: form
      })
      .json()
    console.log(
      `Updated url of course(${data.courseId})/assignment(${data.assignmentId}) to: ${body.external_tool_tag_attributes.url}`
    )
  }
}

start()
