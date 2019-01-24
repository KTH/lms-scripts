const fs = require('fs')
const CanvasApi = require('kth-canvas-api')
require('dotenv').config()
const canvasApi = new CanvasApi(apiUrl, apiKey)

const csvLines = fs.readFileSync(oldProvisioningFile, 'utf8')
    .toString()
    .split('\n')

async function update() {
    for (const line of csvLines) {

        process.exit()
    }
}
update()
