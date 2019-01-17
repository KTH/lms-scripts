const fs = require('fs')
require('colors')
async function diff(){
    const ugFile = 'all-ug-users.csv'
    const provisioningFile = 'provisioning_csv_17_Jan_2019_15920190117-6270-tij52n.csv'
    const provisioningFilecontentObj = {}

    const provisioningFilecontent = fs.readFileSync(provisioningFile, 'utf8')
        .toString()
        .split('\n')

    for (const line of provisioningFilecontent) {
        const [ ,sis_id,,,login_id,,,,,email,,created_by_sis  ]= line.split(',') 
        provisioningFilecontentObj[sis_id] = {
            sis_id, login_id,email,created_by_sis
        }
    }

    const ugFilecontent = fs.readFileSync(ugFile, 'utf8')
        .toString()
        .split('\n')

    let i = 0 
    for (const line of ugFilecontent){
        const [ sis_id, username, email ]= line.split(',')
        const provisioningObj = provisioningFilecontentObj[sis_id] 
        if(
            provisioningObj &&
            email !== provisioningObj.email
        ){
            i++
            console.log('-----------------')
            console.log(`<<< Canvas: ${sis_id}: ${provisioningObj.email}`.yellow)
            console.log(`>>>     UG: ${sis_id}: ${email}`.blue)
        }
    }
    console.log('Total: ', i)

} 
diff()
