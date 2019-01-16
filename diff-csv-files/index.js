const fs = require('fs')
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
    console.log( file2contentObj )
} 
diff()
