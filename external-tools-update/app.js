require('dotenv').config()
const Canvas = require('@kth/canvas-api')
const inquirer = require('inquirer')

const token = process.env.CANVAS_API_TOKEN
const url = process.env.CANVAS_API_URL
const canvas = Canvas(url, token)

const foundTools = []
const config = {
  year: 0,
  account: '',
  toolName: '',
  toolFields: {}
}

var inquirerQuestions = [
  {
    type: 'input',
    name: 'year',
    message: 'Omit courses starting before year: (0 or Enter to scan all courses) \n  Note: courses without start date will always be included.',
    default: 0,
    validate: function (answer) {
      if (!isNumber(parseInt(answer, 10))) {
        return 'Please define year correctly!'
      }
      return true
    }
  },
  {
    type: 'input',
    name: 'account',
    message: 'Which account do you want to search?',
    default: 1
  },
  {
    type: 'input',
    name: 'toolName',
    message: 'Which tool you want to modify? (exact name)',
    validate: function (answer) {
      if (answer.length < 1) {
        return 'You must specify the name of the tool!'
      }
      return true
    }
  },
  {
    type: 'checkbox',
    message: 'Select External Tool fields to modify',
    name: 'toolFields',
    choices: [
      new inquirer.Separator('External Tool fields'),
      {
        name: 'name'
      },
      {
        name: 'url'
      },
      {
        name: 'domain'
      }
    ],
    filter: function (answer) {
      return answer.reduce((accumulator, currentValue) => {
        accumulator[currentValue] = ''
        return accumulator
      }, {})
    },
    validate: function (answer) {
      if (Object.keys(answer).length < 1) {
        return 'You must choose at least one field.'
      }
      return true
    }
  }
]

function isNumber (value) {
  return typeof value === 'number' && isFinite(value)
}

function createShortObject (course, externalTool) {
  const shortObject = {}

  shortObject.courseId = course.id
  shortObject.courseCode = course.course_code
  shortObject.toolId = externalTool.id
  shortObject.toolName = externalTool.name
  shortObject.toolDomain = externalTool.domain
  shortObject.toolUrl = externalTool.url
  shortObject.toolConsumerKey = externalTool.consumer_key

  return shortObject
}

async function updateTool (courseId, toolId) {
  const body = config.toolFields
  await canvas.requestUrl(`/courses/${courseId}/external_tools/${toolId}`, 'PUT', body)
  console.log(`Done with toolId: ${toolId}! Results below:`)

  const updatedTool = await canvas.get(`/courses/${courseId}/external_tools/${toolId}`)
  const course = await canvas.get(`/courses/${courseId}`)
  console.log(createShortObject(course.body, updatedTool.body))
}

async function sanityCheck (foundTools) {
  await inquirer
    .prompt({
      type: 'confirm',
      name: 'confirmed',
      message: `Are you sure you want to apply changes to ${foundTools.length} external tools?`,
      default: false
    })
    .then(answers => {
      if (!answers.confirmed) {
        console.log('You chose NOT to apply any changes!')
        process.exit(0)
      }
    })
}

async function checkTools (course, queryToolName) {
  const toolSearchUrl = `/courses/${course.id}/external_tools`
  for await (const externalTool of canvas.list(toolSearchUrl)) {
    if (externalTool.name === queryToolName) {
      foundTools.push(createShortObject(course, externalTool))
    }
  };
}

async function searchCourses () {
  const courseSearchUrl = `/accounts/${config.account}/courses`
  for await (const course of canvas.list(courseSearchUrl)) {
    const yearStarted = (new Date(course.start_at)).getFullYear()
    if (yearStarted >= config.year || course.start_at === null) {
      // Courses with start date = null, get a 1970 in `yearStarted` variable, hence direct check
      await checkTools(course, config.toolName)
    }
  }
}

async function asyncForEach (arr, callback) {
  for (const item of arr) {
    await callback(item)
  }
}

async function getNewToolFields () {
  await asyncForEach(Object.keys(config.toolFields), async (key) => {
    await inquirer
      .prompt({
        type: 'input',
        name: 'newValue',
        message: 'Enter new value for ' + key + ':'
      })
      .then(answers => {
        config.toolFields[key] = answers.newValue
      })
  })
}

async function getConfig () {
  await inquirer
    .prompt(inquirerQuestions)
    .then(answers => {
      Object.assign(config, answers)
    })
}

async function start () {
  await getConfig()
  await getNewToolFields()
  console.log('-------------------------------------------------------------------------------')
  console.log(`Scanning courses in an account with ID: ${config.account}.`)
  console.log(`Searching for ${config.toolName} external tool. This might take a while...`)
  if (config.year !== 0) {
    console.log(`Omitting all courses started before ${config.year}.`)
  }
  await searchCourses()
  console.log('-------------------------------------------------------------------------------')
  if (foundTools.length !== 0) {
    console.log('Printing list of found Tools...')
    console.log(foundTools)
    console.log('-------------------------------------------------------------------------------')
    await sanityCheck(foundTools)
    await asyncForEach(foundTools, async (foundTool) => {
      console.log('-------------------------------------------------------------------------------')
      await updateTool(foundTool.courseId, foundTool.toolId)
    })
    console.log('-------------------------------------------------------------------------------')
    console.log('Done and done. Exiting..')
  } else {
    console.log(`No external tools of name: ${config.toolName} found. Quitting..`)
  }
}

start()
