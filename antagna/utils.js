const terms = require('kth-canvas-utilities/terms')
const departmentCodeMapping = require('kth-canvas-utilities/departmentCodeMapping')
const moment = require('moment')
const Promise = require('bluebird') // use bluebird to get a little more promise functions then the standard Promise AP
const {unlink} = require('fs')
let unlinkAsync = Promise.promisify(unlink)

function deleteFile (fileName) {
  return unlinkAsync(fileName)
      .catch(e => console.log("couldn't delete file. It probably doesn't exist. This is fine, let's continue"))
}


function createLongName (round) {
  const termNum = round.startTerm[4]
  const term = terms[termNum]
  const title = round.title[ round.tutoringLanguage === 'Svenska' ? 'sv' : 'en' ]
  let result = round.courseCode
  if (round.shortName) {
    result += ` ${round.shortName}`
  }
  result += ` ${term}${round.startTerm.substring(2, 4)}-${round.roundId} ${title}`
  return result
}

function createSisCourseId ({courseCode, startTerm, roundId}) {
  const termNum = startTerm[4]
  const shortYear = `${startTerm[2]}${startTerm[3]}`
  const term = terms[termNum]

  return `${courseCode}${term}${shortYear}${roundId}`
}

function getSisAccountId ({courseCode}) {
  const firstChar = courseCode[0]
  return `${departmentCodeMapping[firstChar]} - Imported course rounds`
}

function calcStartDate (courseRound) {
  const year = courseRound.startSemester.semester.slice(0,4)
  const weekNumber = courseRound.startSemester.start_week
  const d = moment().year(year).isoWeek(weekNumber).isoWeekday(1)
  d.set({hour: 8, minute: 0, second: 0, millisecond: 0})
  return d.toISOString()
}

function flatten (arr) {
  return [].concat.apply([], arr)
}


module.exports = {
  deleteFile,
  getSisAccountId,
  flatten,

  buildCanvasCourseObjectV2 (courseRound) { //new for course from v2
    if (!courseRound) {
      return
    }
    return {
      sisCourseId: createSisCourseId(courseRound),
      courseCode: courseRound.courseCode,
      shortName: courseRound.shortName,
      longName: createLongName(courseRound),
      startDate: calcStartDate(courseRound),
      sisAccountId: getSisAccountId(courseRound),
      status: 'active'
    }
  },
}
