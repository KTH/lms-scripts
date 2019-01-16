const fs = require('fs')
require('colors')
async function diff(){
    const file1 = 'all-ug-users.csv'
    const file2 = 'provisioning_csv_16_Jan_2019_15720190116-10161-2q8ts0.csv'
    const file2contentObj = {}

    const file2content = fs.readFileSync(file2, 'utf8')
        .toString()
        .split('\n')

    for (const line of file2content) {
        const [ sis_id ]= line.split(',') 
        file2contentObj[sis_id] = line
    }
    
    const file1content = fs.readFileSync(file1, 'utf8')
        .toString()
        .split('\n')

    
    for (const line of file1content){
        const [ sis_id ]= line.split(',')
        //console.log(file2content[sis_id])
        //console.log(sis_id,line)
        if(line !== file2contentObj[sis_id]){
            console.log('-----------------')
            console.log(`>>>     UG: ${line}`.blue)
            console.log(`<<< Canvas: ${file2contentObj[sis_id]}`.yellow)
        }
    }

} 
diff()
