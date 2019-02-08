const fs = require('fs')

const csvLines = fs.readFileSync('/home/emil/Downloads/All\ the\ communication\ channels\ in\ Canvas.csv', 'utf8')
    .toString()
    .split('\n')

const csvLinesUg = fs.readFileSync('/tmp/all-ug-users.csv', 'utf8')
    .toString()
    .split('\n')

const ugUsers = [] 
csvLinesUg
    .map(line => line.split(','))
    .forEach(([ugKthId, ugUsername,ugEmail, ...aliases]) => ugUsers.push({ugKthId, ugUsername, ugEmail,aliases}))

async function update() {
    for (const line of csvLines) {
        process.stdout.write('.')
        const [canvasUserId, kthId,canvasEmail] = line.split(',')
        // Seach for this email in all of the aliases
        const foundAlias = ugUsers.find(ugUser => 
            ugUser.aliases.find(alias => 
                alias === canvasEmail &&  ugUser.ugKthId !== kthId))
        if(foundAlias){
            console.log(canvasEmail,foundAlias)
        }
        //process.exit()
    }
}
update()
