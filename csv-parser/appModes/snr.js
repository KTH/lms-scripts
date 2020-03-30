require('dotenv').config()
const got = require('got')
const inquirer = require('inquirer')

const SCHOOL_MAPPING = {
  A: 'ABE',
  B: 'CBH', // Previously known as BIO
  C: 'CBH',
  D: 'EECS', // Previously known as CSC
  E: 'EECS', // Previously known as EES
  H: 'CBH', // Previously known as STH
  I: 'EECS', // Previously known as ICT
  J: 'EECS',
  K: 'CBH', // Previously known as CHE
  L: 'ITM', // Previously known as ECE
  M: 'ITM',
  S: 'SCI',
  U: 'Other', // Previously known as UF
  V: 'GVS',
  3: 'CBH' // Previously known as Bio or Kemi
}

const TEMPLATE_MAPPING = {
  4074: 'LEQ 6',
  4154: 'LEQ 6 Groups',
  4071: 'LEQ 12',
  4137: 'LEQ 12 Groups',
  4000: 'LEQ 22',
  4134: 'LEQ 22 Groups'
}

function extractMillis (surveyAndReportDate) {
  // '/Date(1536939526000)/'
  const startIndex = surveyAndReportDate.indexOf('(') + 1
  const endIndex = surveyAndReportDate.indexOf(')')
  return parseInt(surveyAndReportDate.substring(startIndex, endIndex), 10)
}

// This checks if the "from date" falls within <desiredYear>-01-01 and <desiredYear>-12-31 (Swedish locale)
function isPublishedFromDesiredYear (
  surveyAndReportFromDate,
  surveyAndReportToDate,
  desiredYear
) {
  const millisFrom = extractMillis(surveyAndReportFromDate)
  const millisTo = extractMillis(surveyAndReportToDate)
  return (
    millisFrom >= new Date(`${desiredYear}-01-01T00:00`).getTime() &&
    millisTo <= new Date(`${desiredYear + 1}-01-01T00:00`)
  )
}

function addSchoolProperty (survey) {
  let initialLetter = survey.Name[0]
  if (initialLetter === 'F') {
    initialLetter = survey.Name[1]
  }
  survey.school = SCHOOL_MAPPING[initialLetter]
}

async function addAnswers (client, survey) {
  const { body } = await client.get(`/JSON/Surveys/${survey.ID}/Answers`)
  survey.answers = body.length
  survey.responseRate = survey.answers / survey.ParticipatingRespondentsCount
}

module.exports = async function () {
  const { desiredYear } = await inquirer.prompt([
    {
      type: 'number',
      name: 'desiredYear',
      message:
        'Please enter the year for which you want to collect statistics!',
      default: 2019
    }
  ])

  let { body } = await got.post(
    'https://sunet.artologik.net/kth/Admin/services/api.svc/authenticate',
    {
      json: true,
      form: true,
      body: {
        mode: 'plain',
        username: process.env.LEQ_SNR_API_USERNAME,
        password: process.env.LEQ_SNR_API_PASSWORD
      }
    }
  )

  const client = got.extend({
    baseUrl: 'https://sunet.artologik.net/kth/Admin/services/api.svc',
    json: true,
    headers: {
      Authorization: body
    }
  })

  ;({ body } = await client.get('/JSON/Surveys', {
    query: {
      q: ' - ',
      type: '1',
      publishedFrom: `${desiredYear}0101`,
      publishedTo: `${desiredYear}1201`,
      status: '2,3'
    }
  }))
  const surveys = body.filter(
    survey =>
      !survey.Name.startsWith('Report') &&
      survey.ParticipatingRespondentsCount > 0 && // Have detected 9 odd courses that have 0 respondents...
      isPublishedFromDesiredYear(
        survey.PublishedFrom,
        survey.PublishedTo,
        desiredYear
      )
  )
  const schoolMap = new Map()
  const templateResponseRateMap = new Map()
  let aggregatedResponseRate = 0
  for (const survey of surveys) {
    let newSchoolMapValue = [1, 0]
    addSchoolProperty(survey)
    if (schoolMap.has(survey.school)) {
      newSchoolMapValue = schoolMap.get(survey.school)
      newSchoolMapValue[0] += 1
      schoolMap.set(survey.school, newSchoolMapValue)
    } else {
      schoolMap.set(survey.school, newSchoolMapValue)
    }
    await addAnswers(client, survey)
    newSchoolMapValue[1] += survey.responseRate
    schoolMap.set(survey.school, newSchoolMapValue)
    let newTemplateResponseRateMapValue = [1, survey.responseRate]
    if (survey.TemplateID === 0) {
      ;({ body } = await client.get(`/JSON/Surveys/${survey.ID}/Templates`))
      survey.TemplateID = body[0].ID
    }
    if (templateResponseRateMap.has(survey.TemplateID)) {
      newTemplateResponseRateMapValue = templateResponseRateMap.get(
        survey.TemplateID
      )
      newTemplateResponseRateMapValue[0] += 1
      newTemplateResponseRateMapValue[1] += survey.responseRate
      templateResponseRateMap.set(
        survey.TemplateID,
        newTemplateResponseRateMapValue
      )
    } else {
      templateResponseRateMap.set(
        survey.TemplateID,
        newTemplateResponseRateMapValue
      )
    }
    aggregatedResponseRate += survey.responseRate
  }

  // Present data
  console.info(`The total number of surveys are ${surveys.length}.`)
  console.info(
    `The global average response rate is ${aggregatedResponseRate /
      surveys.length}.`
  )
  // New segment
  console.info('===')
  for ([key, value] of schoolMap) {
    console.info(
      `The ${key} school published ${value[0]} surveys during ${desiredYear}.`
    )
    console.info(
      `The ${key} school had an average response rate of ${value[1] /
        value[0]}.`
    )
  }
  // New segment
  console.info('===')
  for ([key, value] of templateResponseRateMap) {
    console.info(
      `The total number of surveys of template ${TEMPLATE_MAPPING[key]} is ${
        value[0]
      }.`
    )
    console.info(
      `The average response rate of said template is ${value[1] / value[0]}.`
    )
  }
}
