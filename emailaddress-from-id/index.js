const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');
const CanvasApi = require('@kth/canvas-api').default
require('dotenv').config()
const canvasApi = new CanvasApi('http://kth.test.instructure.com/api/v1',process.env.CANVAS_API_TOKEN)



const out = fs.createWriteStream('output.csv')

fs.createReadStream(path.resolve(__dirname, 'users.csv'))
    .pipe(csv.parse({ headers: true }))
    // pipe the parsed input into a csv formatter
    .pipe(csv.format({ headers: true }))
    // Using the transform function from the formatting stream
  .transform(async (row, next) => {
    try{
      const {body:user} = await canvasApi.get(`users/${row.canvasId}`)
      next(null, {...row,email:user.email})
    }catch(e){
      next(null,row)
        // Ignore errors
      }
    })
    .pipe(out)
