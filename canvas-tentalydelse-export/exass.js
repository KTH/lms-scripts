require('dotenv').config()
const Canvas = require('@kth/canvas-api')
const sanitizeHtml = require('sanitize-html')
const extractUrls = require('extract-urls')
const { createWriteStream } = require('fs')
const fs = require('fs')
const got = require('got')

const token = process.env.CANVAS_API_TOKEN_TEST
const url = process.env.CANVAS_API_URL_TEST
const canvas = Canvas(url, token)

const config = {
  account: '', // for later
  courseId: '26682',
  assignmentId: '146181'
}

const dir = './Export/'
const aDir = './Export/Attachments/'

const parsedAssignments = []

function handleDirectory (dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
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

function createAssignmentObject (name, description, urls, dnames) {
  const shortObject = {}

  shortObject.name = name
  shortObject.description = description
  shortObject.uniqueUrls = urls
  shortObject.uniqueNames = dnames

  return shortObject
}

function saveAssignments (arr) {
  try {
    arr.forEach(element => {
      const path = `${dir}${element.name}.txt`
      const buffer = Buffer.from(element.description)
      fs.open(path, 'w', function (e, fd) {
        if (e) {
          console.error(`Could not open file: ${e}`)
        }
        fs.write(fd, buffer, 0, buffer.length, null, function (e) {
          if (e) console.error(`could not write file: ${e}`)
          fs.close(fd, function () {
            console.log(`Successfully wrote "${element.name}.txt" to ${dir}.`)
          })
        })
      })
    })
  } catch (e) {
    console.error('CAUGHT AN ERROR: ' + e + '. Continuing...')
  }
}

async function getAssignment (config, arr) {
  try {
    const assignment = await canvas.get(`/courses/${config.courseId}/assignments/${config.assignmentId}`)
    var clean = sanitizeHtml(assignment.body.description, {
      allowedTags: ['img', 'a', 'em'],
      allowedAttributes: {
        a: ['href'],
        img: ['src', 'alt', 'data-api-endpoint']
      }
    })
    var dlist = getUniqueFileUrls(clean)
    console.log(`Processing Assignment ID:${assignment.body.id}: ${assignment.body.name}`)
    var dnames = await processFiles(dlist, parsedAssignments)
    arr.push(createAssignmentObject(assignment.body.name, clean, dlist, dnames))
  } catch (e) {
    console.error('CAUGHT AN ERROR: ' + e + '. Continuing...')
  }
}

async function processFiles (arr) {
  for (const element of arr) {
    const file = await canvas.get(`/files/${element}`)
    const dname = file.body.filename
    const durl = file.body.url
    const dlock = file.body.locked
    const dlockExp = file.body.lock_explanation
    const did = element
    await downloadFile(dname, durl, dlock, dlockExp, did)
  }
}

async function downloadFile (dname, durl, dlock, dlockExp, did) {
  if (dlock === false) {
    const downloadStream = got.stream(durl)
    const fileWriterStream = createWriteStream(`${aDir}${did}_${dname}`)

    await downloadStream
      .on('error', (e) => {
        console.error(`Download failed: ${e.message}`)
      })

    fileWriterStream
      .on('error', (e) => {
        console.error(`Could not write file "${did}_${dname}" to system: ${e.message}`)
      })
      .on('finish', () => {
        console.log(`File "${did}_${dname}" downloaded to ${aDir}`)
      })

    await downloadStream.pipe(fileWriterStream)
  } else {
    console.log(`File "${dname}" ID: ${did} is locked. Continuing...`)
    fs.open(`${aDir}lockedFiles.txt`, 'w', function (e, id) {
      fs.write(id, `Failed to download file "${dname}" with ID: ${did}. Reason: ${dlockExp}` + '\n', null, 'utf8', function () {
        fs.close(id, function () {
          console.log('Lock file is updated.')
        })
      })
    })
  }
}

async function start () {
  handleDirectory(dir)
  handleDirectory(aDir)
  await getAssignment(config, parsedAssignments)
  saveAssignments(parsedAssignments)
}

start()
