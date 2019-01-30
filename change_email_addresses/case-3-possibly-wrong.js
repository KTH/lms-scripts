const fs = require('fs')
const CanvasApi = require('kth-canvas-api')
require('dotenv').config()
const canvasApi = new CanvasApi(process.env.CANVAS_API_URL,process.env.CANVAS_API_KEY )

const csvLines = fs.readFileSync('Possibly wrong email addresses.csv', 'utf8')
    .toString()
    .split('\n')

const csvLinesUgRef = fs.readFileSync('all-ug-ref-users.csv', 'utf8')
    .toString()
    .split('\n')

const ugUsers = {}
csvLinesUgRef
    .map(line => line.split(','))
    .forEach(([ugKthId, ugUsername,ugEmail]) => ugUsers[ugKthId]={ugKthId, ugUsername, ugEmail})
let usersWithEmailFromUgRef = []
let usersNotInUgRef= []
let others = []
async function update() {
    for (const line of csvLines) {
        //console.log('----------------', line)
        const [canvasUserId,sisUserId,canvasEmail] = line.split(',')

        if(  canvasUserId === 'canvas_id') continue // skip headers
        if(  !canvasUserId ) continue // Ignore empty lines

        const ugUser = ugUsers[sisUserId]
        if(!ugUser){
           usersNotInUgRef.push(ugUser) 
        }
        else if(ugUser.ugEmail === canvasEmail){
            usersWithEmailFromUgRef.push(ugUser)
        }else{
            others.push(ugUser)
        }
    }
    console.log('done :)', )
    console.log('Users with incorrect email from ug ref:', usersWithEmailFromUgRef.length)
    console.log('Users that dont exist in ug ref:', usersNotInUgRef.length)
    console.log('Others:', others.length)
}
update()
