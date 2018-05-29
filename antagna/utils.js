const terms = require('kth-canvas-utilities/terms')
const {unlink} = require('fs')
let unlinkAsync = Promise.promisify(unlink)

function deleteFile (fileName) {
  return unlinkAsync(fileName)
      .catch(e => console.log("couldn't delete file. It probably doesn't exist. This is fine, let's continue"))
}

module.exports = {
  deleteFile
}