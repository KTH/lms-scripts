const ldap = require('ldapjs')
const { deleteFile, writeLine, createCsvFolder } = require('./csvFile')
const attributes = ['ugKthid', 'name']
require('dotenv').config()

var inquirer = require('inquirer')
const moment = require('moment')
const currentYear = moment().year()
const years = []
const { VT, HT } = require('kth-canvas-utilities/terms')
const got = require('got')
const util = require('util')

async function getUsersForMembers (members, ldapClient) {
  const usersForMembers = []
  for (let member of members) {
    const searchResult = await new Promise((resolve, reject) => {
      ldapClient.search('OU=UG,DC=ug,DC=kth,DC=se', {
        scope: 'sub',
        filter: `(distinguishedName=${member})`,
        timeLimit: 10,
        paging: true,
        attributes,
        paged: {
          pageSize: 1000,
          pagePause: false
        }
      }, (err, res) => {
        if (err) {
          reject(err)
          return
        }
        const users = []
        res.on('searchEntry', entry => {
          if (Array.isArray(entry.object)) {
            users.push(...entry.object)
          } else {
            users.push(entry.object)
          }
        })
        res.on('end', entry => {
          if (entry.status !== 0) {
            reject(new Error(`Rejected with status: ${entry.status}`))
            return
          }
          resolve(users)
        })
        res.on('error', reject)
      })
    })
    usersForMembers.push(...searchResult)
  }
  return usersForMembers
}

async function searchGroup (filter, ldapClient) {
  return new Promise((resolve, reject) => {
    ldapClient.search('OU=UG,DC=ug,DC=kth,DC=se', {
      scope: 'sub',
      filter,
      timeLimit: 11,
      paged: true
    }, (err, res) => {
      if (err) {
        reject(err)
        return
      }
      const members = []
      res.on('searchEntry', entry => {
        if (Array.isArray(entry.object.member)) {
          members.push(...entry.object.member)
        } else {
          members.push(entry.object.member)
        }
      }) // We will get one result for the group where querying for
      res.on('end', entry => {
        if (entry.status !== 0) {
          reject(new Error(`Rejected with status: ${entry.status}`))
          return
        }
        resolve(members)
      })
      res.on('error', reject)
    })
  })
}

async function writeAntagnaForCourse ({ course, ldapClient, startTerm, fileName }) {
  const roundId = course.offering_id
  const sisCourseId = `${course.course_code}${course.first_semester}${roundId}` // A11IYAVT181
  const courseInitials = course.course_code.substring(0, 2)
  const courseCodeLast = course.course_code.substring(2)
  const members = await searchGroup(`(&(objectClass=group)(CN=ladok2.kurser.${courseInitials}.${courseCodeLast}.antagna_${startTerm}.${roundId}))`,
    ldapClient)
  const enrolled = await getUsersForMembers(members, ldapClient)
  for (let student of enrolled) {
    await writeLine([sisCourseId, student.ugKthid, 'Admitted not registered', 'active'], fileName)
  }
}

createCsvFolder()

console.log(`
  Detta är ett program för att ta
  fram alla antagna studenter under en
  viss period ur KTHs system
  och spara dem i csv-filen, för import till Canvas LMS`)

for (var i = -2; i < 4; i++) {
  years.push(`${currentYear + i}`)
}

const terms = [
  {
    name: 'Hösttermin',
    value: HT },
  {
    name: 'Vårtermin',
    value: VT
  }]

const periods = {
  [HT]: ['0', '1', '2'],
  [VT]: ['3', '4', '5']
}

module.exports = async function () {
  const { year, term } = await inquirer.prompt([
    {
      message: 'Välj år',
      name: 'year',
      choices: years,
      type: 'list',
      default: `${currentYear}`
    },
    {
      message: 'Välj termin',
      name: 'term',
      choices: terms,
      type: 'list'
    }
  ])

  const { period, koppsBaseUrl } = await inquirer.prompt([
    {
      message: 'Välj period',
      name: 'period',
      choices: periods[term],
      type: 'list'
    },
    {
      message: 'Sista frågan, vilken koppsmiljö ska vi hämta data från?',
      name: 'koppsBaseUrl',
      choices: [
        { name: 'ref', value: 'https://www-r.referens.sys.kth.se/api/kopps/' },
        { name: 'prod', value: 'https://www.kth.se/api/kopps/' }
      ],
      type: 'list'
    }])

  const { body } = await got({
    url: `${koppsBaseUrl}v2/courses/offerings?from=${year}${term}&skip_coordinator_info=true`,
    json: true
  })

  const canvasCourses = body.filter(courseOffering => courseOffering.state === 'Godkänt' || courseOffering.state === 'Fullsatt')
    .filter(courseOffering => courseOffering.first_period === `${year}${term}P${period}`)

  const ldapClient = ldap.createClient({
    url: process.env.ugUrl
  })
  const ldapClientBindAsync = util.promisify(ldapClient.bind).bind(ldapClient)
  await ldapClientBindAsync(process.env.ugUsername, process.env.ugPwd)

  const fileName = `csv/antagna-enrollment-${year}${term}-${period}.csv`
  await deleteFile(fileName)
  await writeLine([
    'section_id',
    'user_id',
    'role',
    'status'
  ], fileName)

  const startTerm = `${year}${term}`
  for (let course of canvasCourses) {
    await writeAntagnaForCourse({ course, ldapClient, startTerm, fileName })
  }

  console.log('😀 Done!')

  const ldapClientUnbindAsync = util.promisify(ldapClient.unbind).bind(ldapClient)
  await ldapClientUnbindAsync()
}
