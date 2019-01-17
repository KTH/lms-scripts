const fs = require('fs')
require('colors')
async function diff(){
    const ugFile = 'all-ug-users.csv'
    const provisioningFile = 'provisioning_csv_16_Jan_2019_15820190116-18321-rw1ulx_include_created_by_sis.csv'
    const provisioningFilecontentObj = {}

    const provisioningFilecontent = fs.readFileSync(provisioningFile, 'utf8')
        .toString()
        .split('\n')

    for (const line of provisioningFilecontent) {
        const [ ,sis_id,,,login_id,,,,,email,,created_by_sis  ]= line.split(',') 
        provisioningFilecontentObj[sis_id] = {
            sis_id, login_id,email,created_by_sis
        }
       console.log(provisioningFilecontentObj[sis_id]) 
    }
    
    const ugFilecontent = fs.readFileSync(ugFile, 'utf8')
        .toString()
        .split('\n')

   let i = 0 
    for (const line of ugFilecontent){
        const [ sis_id, loginid, email ]= line.split(',')
        
        if(line !== provisioningFilecontentObj[sis_id]){
            i++
            console.log('-----------------')
            console.log(`>>>     UG: ${line}`.blue)
            console.log(`<<< Canvas: ${provisioningFilecontentObj[sis_id]}`.yellow)
        }
    }
    console.log('Total: ', i)

} 
diff()
