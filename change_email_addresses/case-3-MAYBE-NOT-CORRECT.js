const fs = require('fs')

const csvLines = fs.readFileSync('case-3-MAYBE-NOT-CORRECT.csv', 'utf8')
    .toString()
    .split('\n')

const csvLinesUgRef = fs.readFileSync('all-ug-ref-users.csv', 'utf8')
    .toString()
    .split('\n')

const ugUsers = {}
csvLinesUgRef
    .map(line => line.split(','))
    .forEach(([ugKthId, ugUsername,ugEmail]) => ugUsers[ugKthId]={ugKthId, ugUsername, ugEmail})

const replaceFileName = 'case-3-MAYBE-NOT-CORRECT-a:replace.csv'
const ignoreFileName = 'case-3-MAYBE-NOT-CORRECT-b:ignore.csv'
const manualFileName = 'case-3-MAYBE-NOT-CORRECT-c:manual-check.csv'

async function update() {

    for (const fileName of [replaceFileName, ignoreFileName, manualFileName]){
        fs.writeFileSync(fileName,'canvas_id,sis_user_id,canvas_emails,status,status_comment,action,action_comment')
    }
    for (const line of csvLines) {
        //console.log('----------------', line)
        const [canvasUserId,sisUserId,canvasEmail] = line.split(',')

        if(  canvasUserId === 'canvas_id') continue // skip headers
        if(  !canvasUserId ) continue // Ignore empty lines

        const ugUser = ugUsers[sisUserId]
        const data = {...ugUser, line} 
        if(!ugUser){
            fs.appendFileSync(ignoreFileName, line+ '\n')
        }else if(ugUser.ugEmail === canvasEmail){
            fs.appendFileSync(replaceFileName,line+ '\n')
        }else{
            fs.appendFileSync(manualFileName, line+ '\n')
        }
    }
}
update()
