require('dotenv').config()
const Canvas = require('@kth/canvas-api')
const sanitizeHtml = require('sanitize-html')
const extractUrls = require('extract-urls')
const { createWriteStream } = require('fs')
const fs = require('fs')
const got = require('got')

const convert = require('xml-js')

const token = process.env.CANVAS_API_TOKEN_TEST
const url = process.env.CANVAS_API_URL_TEST
const canvas = Canvas(url, token)

const config = {
  account: '', // for later
  courseId: '23019'
}

const parsedAssignments = []
var attachmentInfo = []
var assIds = []

// var xml = fs.readFile('./example.xml', 'utf8', function (err, data) {
//   if (err) {
//     return console.log(err)
//   }
//   // console.log(data)
// })

function handleDirectory (dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true }, err => { console.log(`Error handling folders: ${err}`) })
  }
}

function reStripAndReconstruct (re, arr, oarr) {
  arr.forEach(element => {
    try {
      if (re.exec(element) !== null) {
        oarr.push(re.exec(element)[1])
      }
    } catch (e) {
      console.error('CAUGHT AN ERROR: ' + e + '. Continuing...')
    }
  })
}

function onlyUnique (value, index, self) {
  return self.indexOf(value) === index
}

function getUniqueFileUrls (string) {
  var urls = extractUrls(string)
  var re = / *\/files\/(\d+)/
  var oarr = []
  reStripAndReconstruct(re, urls, oarr)
  var unique = oarr.filter(onlyUnique)
  return unique
}

function createAssignmentObject (id, name, description, urls, dnames) {
  const shortObject = {}

  shortObject.id = id
  shortObject.name = name
  shortObject.description = description
  shortObject.uniqueUrls = urls
  shortObject.uniqueNames = dnames

  return shortObject
}

async function saveAssignments (arr, dir, arrF, courseInfo) {
  try {
    arr.forEach(element => {
      const path = `${dir}/${element.id}_${element.name}.txt`
      arrF.push(path)
      const buffer = Buffer.from(element.description)
      fs.open(path, 'w', function (e, fd) {
        if (e) {
          console.error(`Could not open file: ${e}`)
        }
        fs.write(fd, buffer, 0, buffer.length, null, function (e) {
          if (e) console.error(`could not write file: ${e}`)
          fs.close(fd, function () {
            console.log(`Successfully wrote "${element.id}_${element.name}.txt" to ${dir}.`)
          })
        })
      })
    })
  } catch (e) {
    console.error('CAUGHT AN ERROR: ' + e + '. Continuing...')
  }
  makeXml(courseInfo, attachmentInfo)
}

function saveXML (arr, dir, courseId) {
  try {
    arr.forEach(element => {
      const path = `${dir}/${courseId}.xml`
      const buffer = Buffer.from(element, 'utf-8')
      fs.open(path, 'w', function (e, fd) {
        if (e) {
          console.error(`Could not open file: ${e}`)
        }
        fs.write(fd, buffer, 0, buffer.length, null, function (e) {
          if (e) console.error(`could not write file: ${e}`)
          fs.close(fd, function () {
            console.log(`Successfully wrote "${courseId}.xml" to ${dir}.`)
          })
        })
      })
    })
  } catch (e) {
    console.error('CAUGHT AN ERROR: ' + e + '. Continuing...')
  }
}

function getAssignmentDetails (arr) {
  var arrOut = []
  arr.forEach(element => {
    arrOut.push(element.id)
  })
  return arrOut
}

async function getCourse (config, attachmentInfo) {
  var dir = `./${config.courseId}`
  var aDir = `./${config.courseId}/Attachments`
  const courseInfo = await canvas.get(`/courses/${config.courseId}`)
  handleDirectory(dir)
  handleDirectory(aDir)
  await getAssignmentList(config)
  await getAssignment(config, assIds, parsedAssignments, aDir, courseInfo)
  await saveAssignments(parsedAssignments, dir, attachmentInfo, courseInfo)
}

async function getAssignmentList (config) {
  const assignments = await canvas.get(`/courses/${config.courseId}/assignments`)
  assIds = getAssignmentDetails(assignments.body)
}

async function getAssignment (config, arrIn, arrOut, aDir, courseInfo) {
  for (const assignmentId of arrIn) {
    try {
      const assignment = await canvas.get(`/courses/${config.courseId}/assignments/${assignmentId}`)
      var clean = sanitizeHtml(assignment.body.description, {
        allowedTags: ['img', 'a', 'em'],
        allowedAttributes: {
          a: ['href'],
          img: ['src', 'alt', 'data-api-endpoint']
        }
      })
      var dlist = getUniqueFileUrls(clean)
      console.log(`Processing Assignment ID:${assignment.body.id}: ${assignment.body.name}`)
      var dnames = await processFiles(dlist, aDir)
      arrOut.push(createAssignmentObject(assignment.body.id, assignment.body.name, clean, dlist, dnames))
    } catch (e) {
      console.error('CAUGHT AN ERROR: ' + e + '. Continuing...')
    }
  }
  makeXml(courseInfo, attachmentInfo)
}

async function processFiles (arr, aDir) {
  for (const element of arr) {
    const file = await canvas.get(`/files/${element}`)
    const dname = file.body.filename
    const durl = file.body.url
    const dlock = file.body.locked
    const dlockExp = file.body.lock_explanation
    const did = element
    await downloadFile(dname, durl, dlock, dlockExp, did, aDir, attachmentInfo)
  }
}

async function downloadFile (dname, durl, dlock, dlockExp, did, aDir, arrF) {
  if (dlock === false) {
    const downloadStream = got.stream(durl)
    const fileWriterStream = createWriteStream(`${aDir}/${did}_${dname}`)

    await downloadStream
      .on('error', (e) => {
        console.error(`Download failed: ${e.message}`)
      })

    await fileWriterStream
      .on('error', (e) => {
        console.error(`Could not write file "${did}_${dname}" to system: ${e.message}`)
      })
      .on('finish', () => {
        console.log(`File "${did}_${dname}" downloaded to ${aDir}`)
        arrF.push(`${aDir}/${did}_${dname}`)
      })

    await downloadStream.pipe(fileWriterStream)
  } else {
    console.log(`File "${dname}" ID: ${did} is locked. Continuing...`)
    fs.open(`${aDir}/lockedFiles.txt`, 'w', function (e, id) {
      fs.write(id, `Failed to download file "${dname}" with ID: ${did}. Reason: ${dlockExp}` + '\n', null, 'utf8', function () {
        fs.close(id, function () {
          console.log('Lock file is updated.')
        })
      })
    })
  }
}

function makeXml (courseInfo, attachmentInfo) {
  // console.log(courseInfo.body.course_code)
  // console.log(courseInfo.body.name)
  // console.log(courseInfo.body.sis_course_id)
  // below is a hot potato
  var xml = fs.readFileSync('example.xml', 'utf8')
  var options = { ignoreComment: false, alwaysChildren: true }
  var kursSpec = convert.xml2js(xml, options)

  function IntTwoChars (i) {
    return (`0${i}`).slice(-2)
  }
  // current timestamp in milliseconds
  const dateTs = new Date(Date.now())
  const dd = IntTwoChars(dateTs.getDate())
  const mm = IntTwoChars(dateTs.getMonth() + 1)
  const yyyy = dateTs.getFullYear()
  const dateString = `Exported: ${yyyy}-${mm}-${dd}`
  kursSpec.elements[0].elements[0].elements[0].elements[0].elements[3].elements[0].elements[0].elements[0].text = dateString
  kursSpec.elements[0].elements[0].elements[0].elements[0].elements[19].elements[0].elements[0].elements[0].elements[0].elements[0].elements[0].text = courseInfo.body.course_code
  kursSpec.elements[0].elements[0].elements[0].elements[0].elements[19].elements[0].elements[0].elements[1].elements[0].elements[0].elements[0].text = courseInfo.body.name
  kursSpec.elements[0].elements[0].elements[0].elements[0].elements[19].elements[0].elements[0].elements[2].elements[0].elements[0].elements[0].text = courseInfo.body.sis_course_id

  // course details
  // console.log(kursSpec.elements[0].elements[0].elements[0].elements[0].elements[3].attributes.name) // date and time
  // console.log(kursSpec.elements[0].elements[0].elements[0].elements[0].elements[3].elements[0].elements[0].elements[0].text) // date and time string
  //
  // console.log(kursSpec.elements[0].elements[0].elements[0].elements[0].elements[19].attributes.name) // kurs
  // console.log(kursSpec.elements[0].elements[0].elements[0].elements[0].elements[19].elements[0].elements[0].elements) // kurs obj
  // console.log(kursSpec.elements[0].elements[0].elements[0].elements[0].elements[19].elements[0].elements[0].elements[0].elements[0].elements[0].elements[0].text)
  // console.log(kursSpec.elements[0].elements[0].elements[0].elements[0].elements[19].elements[0].elements[0].elements[1].elements[0].elements[0].elements[0].text)
  // console.log(kursSpec.elements[0].elements[0].elements[0].elements[0].elements[19].elements[0].elements[0].elements[2].elements[0].elements[0].elements[0].text)
  //
  // console.log(kursSpec.elements[0].elements[0].elements[0].elements[0].elements[20].elements[0].elements[0].elements[0].attributes.name) // file name
  // // console.log(kursSpec.elements[0].elements[0].elements[0].elements[0].elements[20].elements[0].elements[0].elements[0].elements[0].elements[0])
  // console.log(kursSpec.elements[0].elements[0].elements[0].elements[0].elements[20].elements[0].elements[0].elements[0].elements[0].elements[0].elements[0].text) // file name falue
  // //
  // console.log(kursSpec.elements[0].elements[0].elements[0].elements[0].elements[20].elements[0].elements[0].elements[1].attributes.name) // description
  // // console.log(kursSpec.elements[0].elements[0].elements[0].elements[0].elements[20].elements[0].elements[0].elements[0].elements[0].elements[0])
  // console.log(kursSpec.elements[0].elements[0].elements[0].elements[0].elements[20].elements[0].elements[0].elements[1].elements[0].elements[0].elements[0].text) // description value
  // //
  // console.log(kursSpec.elements[0].elements[0].elements[0].elements[0].elements[20].elements[0].elements[0].elements[2].attributes.name) // bev
  // // console.log(kursSpec.elements[0].elements[0].elements[0].elements[0].elements[20].elements[0].elements[0].elements[0].elements[0].elements[0])
  // console.log(kursSpec.elements[0].elements[0].elements[0].elements[0].elements[20].elements[0].elements[0].elements[2].elements[0].elements[0].elements[0].text) // bev val
  // //
  // console.log(kursSpec.elements[0].elements[0].elements[0].elements[0].elements[20].elements[0].elements[0].elements[3].attributes.name) // time
  // // console.log(kursSpec.elements[0].elements[0].elements[0].elements[0].elements[20].elements[0].elements[0].elements[0].elements[0].elements[0])
  // console.log(kursSpec.elements[0].elements[0].elements[0].elements[0].elements[20].elements[0].elements[0].elements[3].elements[0].elements[0].elements[0].text) // time value
  const attachment = kursSpec.elements[0].elements[0].elements[0].elements[0].elements[20].elements[0].elements[0]
  var temparr = []
  var test1 = attachment

  console.log(attachmentInfo)

  test1.elements[0].elements[0].elements[0].elements[0].text = 'FILENAME TESTTESTTESTTEST'
  temparr.push(test1)
  // console.log(JSON.stringify(temparr, null, 4))
  kursSpec.elements[0].elements[0].elements[0].elements[0].elements[20].elements[0].elements = temparr

  var options2 = { compact: false, ignoreComment: false, spaces: 4 }
  var kursSpecArr = []
  kursSpecArr.push(convert.js2xml(kursSpec, options2))
  saveXML(kursSpecArr, './', 123)
}

function start () {
  getCourse(config, attachmentInfo) // main function
}

start()
