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
    .transform((row, next) => {
      next(null, row)

        // User.findById(row.id, (err, user) => {
        //     if (err) {
        //         return next(err);
        //     }
        //     return next(null, {
        //         id: row.id,
        //         firstName: row.first_name,
        //         lastName: row.last_name,
        //         address: row.address,
        //         // properties from user
        //         isVerified: user.isVerified,
        //         hasLoggedIn: user.hasLoggedIn,
        //         age: user.age,
        //     });
        // });
    })
    .pipe(out)
