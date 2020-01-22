require('dotenv').config()
const Canvas = require('@kth/canvas-api')
const ObjectsToCsv = require('objects-to-csv')
const inquirer = require('inquirer')

const token = process.env.CANVAS_API_TOKEN
const url = process.env.CANVAS_API_URL
const canvas = Canvas(url, token)

const foundTools = []
const config = {
  year: 0,
  account: '',
  searchParam: '',
  searchTerm: '',
  modify: '',
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
    type: 'confirm',
    name: 'modify',
    message: 'Do you want to make changes? (default: No)',
    default: false
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

async function asyncForEach (arr, callback) {
  for (const item of arr) {
    await callback(item)
  }
}

async function saveToCsv (arr, file) {
  const csv = new ObjectsToCsv(arr)
  await csv.toDisk(file)
  console.log('List was saved as ' + file + '.')
  console.log('-------------------------------------------------------------------------------')
  console.log('')
}

async function getSearchMethod () {
  await inquirer
    .prompt({
      type: 'list',
      message: 'Select Search Method',
      name: 'searchParam',
      choices: [
        new inquirer.Separator('Search Parameter'),
        {
          name: 'name'
        },
        {
          name: 'url'
        }
      ]
    })
    .then(answers => {
      config.searchParam = answers.searchParam
    })
}

async function getSearchTerm () {
  await inquirer
    .prompt({
      type: 'input',
      name: 'searchTerm',
      message: 'Enter your search term (exact):',
      validate: function (answer) {
        if (answer.length < 1) {
          return 'You must specify the search term!'
        }
        return true
      }
    })
    .then(answers => {
      config.searchTerm = answers.searchTerm
    })
}

async function getConfig () {
  await inquirer
    .prompt(inquirerQuestions)
    .then(answers => {
      Object.assign(config, answers)
    })
}

async function getToolFields () {
  await inquirer
    .prompt({
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
    })
    .then(answers => {
      Object.assign(config.toolFields, answers.toolFields)
    })
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

async function csvOption () {
  await inquirer
    .prompt({
      type: 'confirm',
      name: 'csv',
      message: 'Do you want to save results to csv? (default: No)',
      default: false
    })
    .then(answers => {
      config.csv = answers.csv
    })
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

async function checkToolsByName (course, searchTerm) {
  const toolSearchUrl = `/courses/${course.id}/external_tools`
  for await (const externalTool of canvas.list(toolSearchUrl)) {
    if (externalTool.name === searchTerm) {
      foundTools.push(createShortObject(course, externalTool))
    }
  };
}

async function checkToolsByURL (course, searchTerm) {
  const toolSearchUrl = `/courses/${course.id}/external_tools`
  for await (const externalTool of canvas.list(toolSearchUrl)) {
    if (externalTool.url === searchTerm) {
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
      if (config.searchParam === 'name') {
        await checkToolsByName(course, config.searchTerm)
      } else {
        await checkToolsByURL(course, config.searchTerm)
      }
    }
  }
}

async function updateTool (courseId, toolId) {
  const body = config.toolFields
  await canvas.requestUrl(`/courses/${courseId}/external_tools/${toolId}`, 'PUT', body)
  console.log(`Done with toolId: ${toolId}! Results below:`)

  const updatedTool = await canvas.get(`/courses/${courseId}/external_tools/${toolId}`)
  const course = await canvas.get(`/courses/${courseId}`)
  console.log(createShortObject(course.body, updatedTool.body))
}

async function start () {
  await getSearchMethod()
  await getSearchTerm()
  await getConfig()
  if (config.modify) {
    await getToolFields()
    await getNewToolFields()
  }
  await csvOption()
  console.log('-------------------------------------------------------------------------------')
  console.log(`Scanning courses in an account with ID: ${config.account}.`)
  console.log(`Searching for external tool with ${config.searchParam}: ${config.searchTerm}.`)
  console.log('This might take a moment...')
  if (config.year !== 0) {
    console.log(`Omitting all courses started before ${config.year}.`)
  }
  await searchCourses()
  console.log('-------------------------------------------------------------------------------')
  if (foundTools.length !== 0) {
    console.log('Printing list of found Tools...')
    console.log('-------------------------------------------------------------------------------')
    console.log(foundTools)
    console.log('-------------------------------------------------------------------------------')
    if (config.csv) {
      await saveToCsv(foundTools, 'foundTools.csv')
    }
    if (config.modify) {
      await sanityCheck(foundTools)
      await asyncForEach(foundTools, async (foundTool) => {
        console.log('-------------------------------------------------------------------------------')
        await updateTool(foundTool.courseId, foundTool.toolId)
      })
    }
    console.log('-------------------------------------------------------------------------------')
    console.log('Done and done. Exiting..')
    console.log('-------------------------------------------------------------------------------')
  } else {
    console.log(`No external tools of name: ${config.toolName} found. Quitting..`)
    console.log('-------------------------------------------------------------------------------')
  }
}

start()
