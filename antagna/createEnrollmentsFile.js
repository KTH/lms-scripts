const Promise = require('bluebird')
const ldap = require('ldapjs')
const fs = Promise.promisifyAll(require('fs'))
const csvFile = require('./csvFile')
require('colors')

const attributes = ['ugKthid', 'name']
const columns = [
  'section_id',
  'user_id',
  'role',
  'status'
]

/*
* For string array with ldap keys for users, fetch every user object
*/
function getUsersForMembers (members) {
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
    res.on('searchEntry', ({object}) => users.push(object))
    res.on('end', () => resolve(users))
    res.on('error', reject)
  }))
  })
  .then(flatten)
}

function flatten (arr) {
  return [].concat.apply([], arr)
}

function searchGroup (filter) {
  return ldapClient.searchAsync('OU=UG,DC=ug,DC=kth,DC=se', {
    scope: 'sub',
    filter,
    timeLimit: 11,
    paged: true
  })
  .then(res => new Promise((resolve, reject) => {
    res.on('searchEntry', ({object}) => resolve(object.member)) // We will get one result for the group where querying for
    res.on('end', ({object}) => resolve(object && object.member))
    res.on('error', reject)
  }))
  .then(member => {
    // Always use arrays as result
    if (typeof member === 'string') {
      return [member]
    } else {
      return member || []
    }
  })
}

/*
* Fetch the members for the examinator group for this course.
* Return a similar array as the in-parameter, with the examinators added
*/
function addExaminators ([teachersMembers, assistantsMembers, courseresponsibleMembers], courseCode) {
  const courseInitials = courseCode.substring(0, 2)
  return searchGroup(`(&(objectClass=group)(CN=edu.courses.${courseInitials}.${courseCode}.examiner))`)
  .then(examinatorMembers => {
    return [teachersMembers, assistantsMembers, courseresponsibleMembers, examinatorMembers]
  })
}

/*
* Fetch the members for the examinator group for this course.
* Return a similar array as the in-parameter, with the examinators added
*/
function addAdmittedStudents ([teachersMembers, assistantsMembers, courseresponsibleMembers, examinatorMembers], courseCode, termin, sisCourseId) {
  const startTerm = termin.replace(':', '')
  const roundId = sisCourseId.substring(sisCourseId.length - 1, sisCourseId.length)
  const courseInitials = courseCode.substring(0, 2)
  const courseCodeLast = courseCode.substring(2)
  return searchGroup(`(&(objectClass=group)(CN=ladok2.kurser.${courseInitials}.${courseCodeLast}.antagna_${startTerm}.${roundId}))`)
  .then(admittedStudents => {
    return [teachersMembers, assistantsMembers, courseresponsibleMembers, examinatorMembers, admittedStudents]
  })
}

/*
* For the given course, fetch all user types from UG and add write all of them to the enrollments file
*/
function writeUsersForCourse ([sisCourseId, courseCode, name]) {
  console.log('writing users for course', courseCode)

  function writeUsers (users, role) {
    return Promise.map(users, user => csvFile.writeLine([sisCourseId, user.ugKthid, role, 'active'], fileName))
  }

  return Promise.map(['teachers', 'assistants', 'courseresponsible'], type => {
    const courseInitials = courseCode.substring(0, 2)
    const startTerm = termin.replace(':', '')
    const roundId = sisCourseId.substring(sisCourseId.length - 1, sisCourseId.length)

    return searchGroup(`(&(objectClass=group)(CN=edu.courses.${courseInitials}.${courseCode}.${startTerm}.${roundId}.${type}))`)
  })
  .then(arrayOfMembers => addExaminators(arrayOfMembers, courseCode))
  .then(arrayOfMembers => addAdmittedStudents(arrayOfMembers, courseCode, termin, sisCourseId))
  .then(arrayOfMembers => Promise.map(arrayOfMembers, getUsersForMembers))
  .then(([teachers, assistants, courseresponsible, examinators, admittedStudents]) => Promise.all([
    writeUsers(teachers, 'teacher'),
    writeUsers(courseresponsible, 'Course Responsible'),
    writeUsers(assistants, 'ta'),
    writeUsers(examinators, 'Examiner'),
    writeUsers(admittedStudents, 'Admitted not registered')
  ])
  )
}
//
/*
* Reads the courses file and splits it's content into an array of arrays.
* One array per line, containing one array per column
*/
function getAllCoursesAsLinesArrays () {
  return fs.readFileAsync(coursesFileName, 'utf8')
  .catch(e => console.error('Could not read the courses file. Have you run the npm script for creating the courses csv file? '.red, e))
  .then(fileContentStr => fileContentStr.split('\n')) // one string per line
  .then(lines => lines.splice(1, lines.length - 2)) // first line is columns, last is new empty line. Ignore them
  .then(lines => lines.map(line => line.split(','))) // split into values per column
}

function deleteFile () {
  return fs.unlinkAsync(fileName)
      .catch(e => console.log("couldn't delete file. It probably doesn't exist. This is fine, let's continue"))
}

function bindLdapClient (username, password) {
  return ldapClient.bindAsync(username, password)
}

function createFileAndWriteHeadlines () {
  return csvFile.writeLine(columns, fileName)
}

let ldapClient
let fileName
let coursesFileName
let termin
module.exports = function ({ugUsername, ugUrl, ugPwd, term, year, period}) {
  termin = `${year}${term}`
  fileName = `csv/enrollments-${termin}-${period}.csv`
  coursesFileName = `csv/courses-${termin}-${period}.csv`

  ldapClient = Promise.promisifyAll(ldap.createClient({
    url: ugUrl
  }))

  return deleteFile()
  .then(() => bindLdapClient(ugUsername, ugPwd))
  .then(createFileAndWriteHeadlines)
  .then(getAllCoursesAsLinesArrays)
  .then(linesArrays => Promise.mapSeries(linesArrays, writeUsersForCourse)) // write all users for each course to the file
  .then(() => console.log('Done!'.green))
  .then(() => fileName)
  .catch(e => console.error(e))
  .finally(() => ldapClient.unbindAsync())
}
