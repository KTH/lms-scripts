const Promise = require('bluebird')
const ldap = require('ldapjs')
const csvFile = require('./csvFile')
const {deleteFile, createSisCourseId} = require('./utils')
const attributes = ['ugKthid', 'name']
require('dotenv').config()

var inquirer = require('inquirer')
const moment = require('moment')
const currentYear = moment().year()
const years = []
const {VT, HT} = require('kth-canvas-utilities/terms')
const rp = require('request-promise')

function getUsersForMembers (members, ldapClient) {
    return Promise.map(members, member => {
      return ldapClient.searchAsync('OU=UG,DC=ug,DC=kth,DC=se', {
        scope: 'sub',
        filter: `(distinguishedName=${member})`,
        timeLimit: 10,
        paging: true,
        attributes,
        paged: {
          pageSize: 1000,
          pagePause: false
        }
      })
        .then(res => new Promise((resolve, reject) => {
          const users = []
          res.on('searchEntry', entry => users.push(entry.object))
          res.on('end', () => resolve(users))
          res.on('error', reject)
        }))
    })
      .then(flatten)
  }
  
  function flatten (arr) {
    return [].concat.apply([], arr)
  }
  
  async function searchGroup (filter, ldapClient) {
    const res = await ldapClient.searchAsync('OU=UG,DC=ug,DC=kth,DC=se', {
      scope: 'sub',
      filter,
      timeLimit: 11,
      paged: true
    })
  
    const member = await new Promise((resolve, reject) => {
      res.on('searchEntry', entry => resolve(entry.object.member)) // We will get one result for the group where querying for
      res.on('end', entry => resolve(entry.object && entry.object.member))
      res.on('error', reject)
    })
  
        // Always use arrays as result
    if (Array.isArray(member)) {
      return member
    } else {
      if (member) {
        return [member]
      } else {
        return []
      }
    }
  }
  

try {
  fs.mkdirSync('csv')
} catch (e) {

}

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
    value: HT},
  {
    name: 'Vårtermin',
    value: VT
  }]

const periods = {
  [HT]: ['0', '1', '2'],
  [VT]: ['3', '4', '5']
}

module.exports = async function () {
  const {year, term} = await inquirer.prompt([
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

  const {period} = await inquirer.prompt([
    {
      message: 'Välj period',
      name: 'period',
      choices: periods[term],
      type: 'list'
    }])

    const {koppsBaseUrl} = await inquirer.prompt(
        {
          message: 'Sista frågan, vilken koppsmiljö ska vi hämta data från?',
          name: 'koppsBaseUrl',
          choices: [
            {name: 'ref', value: 'https://www-r.referens.sys.kth.se/api/kopps/'},
            {name: 'prod', value: 'https://www.kth.se/api/kopps/'}
          ],
          type: 'list'
        })

    const res = await rp({
        url: `${koppsBaseUrl}v2/courses/offerings?from=${year}${term}`,
        method: 'GET',
        json: true,
        headers: {'content-type': 'application/json'}
    })    

    const canvasCourses = res.filter(courseOffering => courseOffering.state === 'Godkänt' || courseOffering.state === 'Fullsatt')
    
    const ldapClient = Promise.promisifyAll(ldap.createClient({
        url: process.env.ugUrl
      }))
      await ldapClient.bindAsync(process.env.ugUsername, process.env.ugPwd)

    const fileName = `csv/antagna-enrollments-${year}${term}-${period}.csv`
    await deleteFile(fileName)
    await csvFile.writeLine([
        'section_id',
        'user_id',
        'role',
        'status'
      ], fileName)
    
    
    for (let course of canvasCourses) {
        const startTerm = `${year}${term}`
        const roundId = course.offering_id
        const sisCourseId = `${course.course_code}${course.first_semester}${roundId}` //A11IYAVT181
        const courseInitials = course.course_code.substring(0, 2)
        const courseCodeLast = course.course_code.substring(2)
        const members = await searchGroup(`(&(objectClass=group)(CN=ladok2.kurser.${courseInitials}.${courseCodeLast}.antagna_${startTerm}.${roundId}))`,
                        ldapClient)
        const antagna = await getUsersForMembers(members, ldapClient)
        for (let student of antagna) {
            await csvFile.writeLine([sisCourseId, student.ugKthid, 'Admitted not registered', 'active'], fileName)
        }
    }

  console.log('😀 Done!')
  await ldapClient.unbindAsync()

}
