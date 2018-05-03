/*
* To run this script, just open a terminal and run it with node.
* Then just follow the instructions on the screen.
*/

process.env['NODE_ENV'] = 'production'
const CanvasApi = require('kth-canvas-api')
const inquirer = require('inquirer')

async function listUseragents () {
  try {
    const {apiUrl} = await inquirer.prompt(
      {
        message: 'Vilken miljö?',
        name: 'apiUrl',
        choices: [
          {name: 'prod', value: 'https://kth.instructure.com/api/v1'},
          {name: 'test', value: 'https://kth.test.instructure.com/api/v1'},
          {name: 'beta', value: 'https://kth.beta.instructure.com/api/v1'}
        ],
        type: 'list'
      })

    const {apiKey} = await inquirer.prompt({
      message: 'Klistra in api nyckel till Canvas här',
      name: 'apiKey',
      type: 'string',
      default: '8779~ZFlsJKMkEsGAU4XOU0yjc7gQfjWH8UAhgb2FVeeFeKzZiHQbT55fDlMXzqBhP3PU'
    })

    const canvasApi = new CanvasApi(apiUrl, apiKey)

    // let allUsers = await canvasApi.listUsers()
    console.log('TODO: remove subset!')

    // Check users in an active course
    const coursesIds = [
      2708,
      2350,
      2265,
      3778,
      3601,
      3659,
      3514,
      2654,
      2445,
      3497,
      3466,
      2751,
      2754,
      2744,
      3646,
      2554,
      3864,
      3463,
      2265,
      3792,
      3778
    ]

    const pageViewsPerUseragent = {}
    for (let courseId of coursesIds) {
      let allUsers = await canvasApi.get(`/courses/${courseId}/users?per_page=100`)

      for (let user of allUsers) {
        try {
          const pageViews = await canvasApi.requestUrl(`users/${user.id}/page_views?per_page=5`) // Only one page, the latest views
          for (let pageView of pageViews) {
            if (pageView.user_agent) {
              const viewsByTheSameUseragent = pageViewsPerUseragent[pageView.user_agent] || 0
              pageViewsPerUseragent[pageView.user_agent] = viewsByTheSameUseragent + 1
            }
          }
        } catch (err) {
          console.warn('an error occured. Ignore it.', err)
        }
      }
    }

    console.log('pageViews', JSON.stringify(pageViewsPerUseragent, null, 4))

    const groupedViews = {}
    for (let k in pageViewsPerUseragent) {
      const v = pageViewsPerUseragent[k]
      if (/canvas|candroid/.test(k)) {
        groupedViews.canvas = (groupedViews.canvas || 0) + v
      }
      if (/Mozilla|BPRODUCT/.test(k)) {
        groupedViews.mozilla = (groupedViews.mozilla || 0) + v
      }
    }
    console.log(groupedViews)
  } catch (err) {
    console.error('an error:', err)
  }
}

listUseragents()
