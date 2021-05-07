require('dotenv').config()
const Canvas = require('@kth/canvas-api')
const sanitizeHtml = require('sanitize-html')
const extractUrls = require('extract-urls')
const https = require('https') // or 'https' for https:// URLs
const fs = require('fs')

const token = process.env.CANVAS_API_TOKEN_TEST
const url = process.env.CANVAS_API_URL_TEST
const canvas = Canvas(url, token)

const config = {
  account: '',
  courseId: '26682',
  assignmentId: '146181',
  toolFields: {}
}

const parsedAssignments = []

function reStripAndReconstruct (re, arr, oarr) {
  arr.forEach(element => {
    // var path = '/files/'
    if (re.exec(element) === null) {

    } else {
      oarr.push(re.exec(element)[1])
    }
  })
}

function onlyUnique (value, index, self) {
  return self.indexOf(value) === index
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
    console.log(assignment.body.name)
    var dnames = await processFiles(dlist, parsedAssignments)
    arr.push(createAssignmentObject(assignment.body.name, clean, dlist, dnames))
  } catch (e) {
    console.log('CAUGHT AN ERROR: ' + e + '. Continuing...')
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
    var file = fs.createWriteStream(`${did}_${dname}`)
    https.get(durl, function (response) {
      response.pipe(file)
    })
  } else {
    console.log(`File "${dname}" ID: ${did} is locked. Skipping...`)
    fs.open('lockedFiles.txt', 'w', function (e, id) {
      fs.write(id, `File "${dname}" with ID: ${did} is locked. Reason: ${dlockExp}` + '\n', null, 'utf8', function () {
        fs.close(id, function () {
          console.log('Lock file is updated.')
        })
      })
    })
  }
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

function saveAssignments (obj) {
  try {
    fs.writeFileSync('test.txt', JSON.stringify(obj))
  } catch (err) {
    console.error(err)
  }
  // obj.forEach(element => {
  //   fs.open(`Assignments/${obj.name}.txt`, 'w', function( e, id ) {
  //     fs.write( id, `hello`, null, 'utf8', function(){
  //       // `${element.description}` + "\n" + `${element.uniqueUrls}` + "\n" + `${element.uniqueNames}`
  //       fs.close(id, function(){
  //       console.log(`${obj.name} Saved.`)
  //       })
  //     })
  //   })
  // })
}

async function start () {
  await getAssignment(config, parsedAssignments)
  saveAssignments(parsedAssignments)
}

start()
