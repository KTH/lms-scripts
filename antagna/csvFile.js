const util = require('util')
const fs = require('fs')

function deleteFile (fileName) {
  try {
    fs.unlinkSync(fileName)
  } catch (e) {
    console.error("couldn't delete file. It probably doesn't exist. This is fine, let's continue")
  }
}
function createCsvFolder () {
  try {
    fs.mkdirSync('csv')
  } catch (e) {
    console.error("couldn't create csv folder")
  }
}

function escapeCsvData (str) {
  str = '' + str

  if (str.includes('"')) {
    console.warn('oh no! bad data!', str)
  }

  if (str.includes(',')) {
    console.log('escaping ', str)
    str = `"${str}"`
  }

  return str
}

async function writeLine (strArr, fileName) {
  const line = createLine(strArr)
  const appendFileAsync = util.promisify(fs.appendFile)
  return appendFileAsync(fileName, line)
}

function createLine (strArr) {
  return strArr.map(escapeCsvData).join(',') + '\n'
}

module.exports = {
  escapeCsvData, writeLine, createLine, deleteFile, createCsvFolder
}
