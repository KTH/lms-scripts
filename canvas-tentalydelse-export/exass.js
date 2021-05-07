require('dotenv').config()
const Canvas = require('@kth/canvas-api')
const sanitizeHtml = require('sanitize-html')
const extractUrls = require('extract-urls')
const { createWriteStream } = require('fs')
const fs = require('fs')
const got = require('got')
const convert = require('xml-js')
const sanitize = require('sanitize-filename')

const token = process.env.CANVAS_API_TOKEN_TEST
const url = process.env.CANVAS_API_URL_TEST
const canvas = Canvas(url, token)

// https://www.npmjs.com/package/bee-queue ?

const config = {
  account: '', // for later
  courseId: '23019',
  list: [23019, 23022, 23025, 23027, 23031, 23033, 23034, 23126]
}

// create folders if they don't exist
function handleDirectory (dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true }, err => { console.error(`Error handling folders: ${err}`) })
  }
}

// extract file ids from urls
function reStripAndReconstruct (re, arr, oarr) {
  arr.forEach(element => {
    try {
      if (re.exec(element) !== null) {
        oarr.push(re.exec(element)[1])
      }
    } catch (e) {
      console.error('- CAUGHT AN ERROR DIR: ' + e + '. Continuing...')
    }
  })
}

// remove duplicate file id entries
function onlyUnique (value, index, self) {
  return self.indexOf(value) === index
}

// process the file urls
function getUniqueFileUrls (string) {
  var urls = extractUrls(string)
  var re = / *\/files\/(\d+)/
  var oarr = []
  if (typeof urls !== 'undefined') {
    reStripAndReconstruct(re, urls, oarr)
    var unique = oarr.filter(onlyUnique)
    return unique
  } else {
    return []
  }
}

// save new xml file
function saveXML (courseId, arr, dir, eDir, kursSpecName) {
  try {
    arr.forEach(element => {
      const path = `${eDir}${dir}/${kursSpecName}.xml`
      const buffer = Buffer.from(element, 'utf-8')
      fs.open(path, 'w', function (e, fd) {
        if (e) {
          console.error(`- CID: ${courseId} - XML FILE ERR: ${e}`)
        }
        fs.write(fd, buffer, 0, buffer.length, null, function (e) {
          if (e) console.error(`- CID: ${courseId} - XML WRITE ERROR: ${e}`)
          fs.close(fd, function () {
            console.info(`- CID: ${courseId} - XML OK: ${eDir}${dir}/${kursSpecName}.xml`)
            console.info(`@ CID: ${courseId} - DONE`)
          })
        })
      })
    })
  } catch (e) {
    console.error(`- CID: ${courseId} - XML ERROR: ${e}. Continuing...`)
  }
}

// get assignment id from array
function getAssignmentDetails (arr) {
  var arrOut = []
  arr.forEach(element => {
    arrOut.push(element.id)
  })
  return arrOut
}

// create sort version of assignment object
function createAssignmentObject (id, name, description, fileObjArr, updated) {
  const assignmentObj = {}
  var fileNameList = []
  var fileIdList = []

  fileObjArr.forEach(element => {
    fileNameList.push(element.name)
  })
  fileObjArr.forEach(element => {
    fileIdList.push(element.id)
  })

  assignmentObj.id = id
  assignmentObj.name = sanitize(name)
  assignmentObj.updated = updated
  assignmentObj.description = description
  assignmentObj.uniqueUrls = fileIdList
  assignmentObj.uniqueNames = fileNameList

  return assignmentObj
}

// convert date to readable format
function convertDate (date, opt) {
  const cDate = new Date(date)
  const localD = cDate.toLocaleDateString('sv')
  const localT = cDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) // cDate.toLocaleTimeString('sv')
  const local = cDate.toLocaleString('sv')
  if (opt === 't') {
    return (`${localD} ${localT}`)
  } if (opt === 'd') {
    return (localD)
  } else {
    return (local)
  }
}

// create assignment txt files
async function saveAssignments (courseId, parsedAssignments, dir, eDir, attachmentList, attachmentDate) {
  try {
    parsedAssignments.forEach(element => {
      const sanitizedElementName = sanitize(element.name)
      const path = `${eDir}${dir}/UPPGIFT_${element.id}_${sanitizedElementName}.txt` // actual path to save file
      const xmlPath = `UPPGIFT_${element.id}_${sanitize(element.name)}.txt` // path for the archive xml file (for batch exports)
      const assignment = ( // compose assignment text file
        `ASSIGNMENT NAME: ${element.name}`).concat('\n',
        `LAST UPDATED AT: ${convertDate(element.updated, 't')}`, '\n',
        '====== ASSIGNMENT DESCRIPTION BEGIN ======', '\n',
        element.description, '\n',
        '====== ASSIGNMENT DESCRIPTION END ======'
      )
      const buffer = Buffer.from(assignment)
      attachmentList.push(xmlPath)
      attachmentDate.push(element.updated)
      fs.open(path, 'w', function (e, fd) {
        if (e) {
          console.error(`- CID: ${courseId} - Could not open file: ${e}`)
        }
        fs.write(fd, buffer, 0, buffer.length, null, function (e) {
          if (e) console.error(`- CID: ${courseId} could not write file: ${e}`)
          fs.close(fd, function () {
            console.info(`- CID: ${courseId} - SAVE OK: ${eDir}${dir}/${element.id}_${sanitizedElementName}.txt`)
          })
        })
      })
    })
  } catch (e) {
    console.error(`- CID: ${courseId} - SAVE ERROR: ' + e + '. Continuing...`)
  }
}

// process course
async function getCourse (courseId) { //, attachmentList) {
  console.info(`@ CID: ${courseId} - BEGIN`)
  var attachmentList = []
  var attachmentDate = []
  var fileDownloadList = []
  const parsedAssignments = []
  const courseInfo = await canvas.get(`courses/${courseId}`)
  const assignments = await canvas.get(`courses/${courseId}/assignments`)
  const assIds = getAssignmentDetails(assignments.body)
  var eDir = './Export'
  var dir = `/${sanitize(courseInfo.body.name)}`
  var aDir = ''
  handleDirectory(`${eDir}${dir}`)
  handleDirectory(`${eDir}${dir}${aDir}`)
  await getAssignments(courseId, assIds, parsedAssignments, fileDownloadList)
  await saveAssignments(courseId, parsedAssignments, dir, eDir, attachmentList, attachmentDate)
  await downloadAttachmentsAndMakeXml(fileDownloadList, dir, aDir, eDir, attachmentList, attachmentDate, courseInfo)
}

// process an assignment
async function getAssignments (courseId, assIds, parsedAssignments, fileDownloadList) {
  for (const assignmentId of assIds) {
    try {
      const assignment = await canvas.get(`courses/${courseId}/assignments/${assignmentId}`)
      if (assignment.body.workflow_state === 'published') {
        if (assignment.body.submission_types[0] === 'online_upload') {
          var sanitizedDescription = sanitizeHtml(assignment.body.description, {
            allowedTags: ['img', 'a', 'em'],
            allowedAttributes: {
              a: ['href'],
              img: ['src', 'alt', 'data-api-endpoint']
            }
          })
          var fileIdList = getUniqueFileUrls(sanitizedDescription)
          console.log(`- CID: ${courseId} - Getting Assignment ID: ${assignment.body.id}: ${assignment.body.name}`)
          if (fileIdList !== [] && fileIdList !== undefined) { // can be undefined for a number of reasons
            var fileObjArr = await processFiles(courseId, fileIdList)
            if (fileObjArr !== [] && fileObjArr !== undefined) { // can be undefined for a number of reasons
              fileObjArr.forEach(file => {
                fileDownloadList.push(file)
              })
            } else {
              fileObjArr = []
            }
          } else {
            fileIdList = []
          }
          var currentAss = createAssignmentObject(assignment.body.id, assignment.body.name, sanitizedDescription, fileObjArr, assignment.body.updated_at)
          parsedAssignments.push(currentAss)
        }
      }
    } catch (e) {
      console.error(`- CID: ${courseId} - GET ERROR: AssID: ${assignmentId}: "${e}". Continuing...`)
    }
  }
}

// process files
async function processFiles (courseId, arr) {
  const fileArr = []
  for (const element of arr) {
    try {
      const file = await canvas.get(`files/${element}`)
      const dlFile = {}

      dlFile.name = file.body.filename
      dlFile.url = file.body.url
      dlFile.lock = file.body.locked
      if (file.body.lock_explanation === undefined) { // if it's not locked, this is undefined
        dlFile.lockExp = 'none'
      } else {
        dlFile.lockExp = file.body.lock_explanation
      }
      dlFile.id = element
      dlFile.updated = (file.body.updated_at)

      fileArr.push(dlFile)
    } catch (e) {
      console.error(`- CID: ${courseId} - PF ERROR: ${element}: ${e.message}. Continuing...`)
      // const failFile = {}

      // failFile.name = 'none'
      // failFile.lock = true
      // failFile.lockExp = 'e.message'
      // failFile.id = element

      // fileArr.push(failFile)
    }
  }
  return fileArr
}

// download all linked attachments and create the xml file
async function downloadAttachmentsAndMakeXml (filesList, dir, aDir, eDir, attachmentList, attachmentDate, courseInfo) {
  const courseId = courseInfo.body.id
  if (filesList.length === 0) {
    makeXml(courseInfo, attachmentList, attachmentDate, dir, eDir)
  } else {
    for (const obj of filesList) { // files list is array of objects that contains file info
      try {
        var i = 0
        if (obj.lock === false) { // some files in Canvas can be locked, which results in no download url, causing an error
          const downloadStream = got.stream(obj.url) // obj.url is the download url obtained from API call
          const fileWriterStream = createWriteStream(`${eDir}${dir}${aDir}/FILE_${obj.id}_${obj.name}`)
          // eDir is general Export directory
          // dir is current course directory
          // aDir is attachment directory
          // obj holds file name and id

          // download using GOT
          downloadStream
            .on('error', async (e) => {
              console.error(`- CID: ${courseId} - ERROR DL: ${e.message}`)
            })

          fileWriterStream
            .on('error', async (e) => {
              console.error(`- CID: ${courseId} - ERROR DL WRITE: "${obj.id}_${obj.name}" to system: ${e.message}`)
            })
            .on('finish', async () => {
              console.log(`- CID: ${courseId} - DOWNLOAD OK: ${eDir}${dir}${aDir}/${obj.id}_${obj.name}`)
              attachmentList.push(`${obj.id}_${obj.name}`)
              attachmentDate.push(obj.updated)
              i++
              if ((i) === (filesList.length)) {
                console.log(`- CID: ${courseId} - ALL DL OK: ${i} of ${filesList.length}`)
                makeXml(courseInfo, attachmentList, attachmentDate, dir, eDir)
              }
            })
          downloadStream.pipe(fileWriterStream)
        } else { // if file is locked, note it down
          console.info(`- CID: ${courseId} - FILE LOCK: "${obj.name}" FILE ID: ${obj.id}. Continuing...`)
          fs.open(`${eDir}${dir}${aDir}/lockedFiles.txt`, 'w', function (e, id) {
            fs.write(id, `- Failed to download file "${obj.name}" with ID: ${obj.id}. Reason: ${obj.lockExp}` + '\n', null, 'utf8', function () {
              fs.close(id, function () {
                attachmentList.push(`${aDir}/lockedFiles.txt`)
                attachmentDate.push(Date.now())
                makeXml(courseInfo, attachmentList, attachmentDate, dir, eDir)
                console.log(`- CID: ${courseId} - Lock file is updated.`)
              })
            })
          })
        }
      } catch (e) {
        console.error(e)
      }
    }
  }
}

// create the xml file
async function makeXml (courseInfo, attachmentList, attachmentDate, dir, eDir) {
  // read empty xml, and make it a js object
  const courseId = courseInfo.body.id
  var xml = fs.readFileSync('kursSpecEmpty_2_1.xml', 'utf8')
  var readOptions = { ignoreComment: false, alwaysChildren: true }
  var kursSpec = convert.xml2js(xml, readOptions)

  // current timestamp in milliseconds
  const dateTs = convertDate(Date.now(), 'd')
  const kursKodRe = /[A-ZÅÄÖ]{2}\d{4}/
  const tentaKodRe = /_(.*?)_/
  var kursKod = courseInfo.body.course_code
  var tentaKod = courseInfo.body.sis_course_id
  if (kursKodRe.exec(courseInfo.body.sis_course_id) !== null) {
    tentaKod = (tentaKodRe.exec(courseInfo.body.sis_course_id))[1]
  }
  if (kursKodRe.exec(courseInfo.body.course_code) !== null) {
    kursKod = (kursKodRe.exec(courseInfo.body.course_code))[0]
  }

  // add export date, script info
  kursSpec.elements[1].elements[6].elements[0] = {
    type: 'text',
    text: `Exported: ${dateTs}`
  }
  kursSpec.elements[1].elements[20].elements[0] = {
    type: 'text',
    text: 'lms-scripts/archive-canvas-assignments'
  }
  kursSpec.elements[1].elements[22].elements[0] = {
    type: 'text',
    text: '0.0.1(alpha)'
  }

  // add course information
  // add course code
  kursSpec.elements[1].elements[37].elements[0].elements[0] = {
    type: 'text',
    text: kursKod
  }
  // add course name
  kursSpec.elements[1].elements[37].elements[2].elements[0] = {
    type: 'text',
    text: courseInfo.body.name
  }
  // add course offering
  kursSpec.elements[1].elements[37].elements[4].elements[0] = {
    type: 'text',
    text: courseInfo.body.sis_course_id
  }
  // add course activity
  kursSpec.elements[1].elements[37].elements[6].elements[0] = {
    type: 'text',
    text: '' // left blank for now
  }
  // Instead of regular SIS_ID for exam rooms in 2020, we now have LADOK ID.
  // Might be more meaningful in the future.

  const attachmentSnippet = JSON.parse(JSON.stringify(kursSpec.elements[1].elements[38])) // move attachment section of xml to variable
  kursSpec.elements[1].elements.splice(38, 1) // remove attachment section from xml

  for (var i = 0; i < attachmentList.length; i++) {
    var tObj = JSON.parse(JSON.stringify(attachmentSnippet)) // copy stencil

    tObj.elements[0].elements[0] = { // assign file name to field
      type: 'text',
      text: attachmentList[i]
    }
    tObj.elements[6].elements[0] = { // assign file modified date to field
      type: 'text',
      // spec says 'format 2001-12-17T09:30:47' but it's not any known standard
      // I'm putting in UTC to see if it works for them
      text: attachmentDate[i]
    }

    kursSpec.elements[1].elements.push(tObj) // push attachment to xml (it's ok since it's at the end of the array)
  }

  // write xml to file
  var writeOptions = { compact: false, ignoreComment: false, spaces: 4, fullTagEmptyElement: true }
  var kursSpecName = `Kursspecifikation-${kursKod}-(${tentaKod})-${dateTs}`
  var kursSpecArr = []
  kursSpecArr.push(convert.js2xml(kursSpec, writeOptions))
  saveXML(courseId, kursSpecArr, dir, eDir, kursSpecName)
}

async function getCoursesFromList (list) {
  for (const courseId of list) {
    try {
      await getCourse(courseId) // main function
    } catch (e) {
      console.error(`- CID: ${courseId} - ERROR COURSE: ${e}. Continuing...`)
    }
  }
}

function start () {
  getCoursesFromList(config.list)
}

start()
