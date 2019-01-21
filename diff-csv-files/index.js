const fs = require('fs')
require('colors')
async function diff(){
    const ugFile = 'all-ug-users.csv'
    const provisioningFile = 'provisioning_csv_17_Jan_2019_15920190117-6270-tij52n.csv'
    const oldProvisioningFile = 'provisioning_csv_06_Aug_2018_11620180806-31721-r7puwy.csv'

    const provisioningFilecontentObj = {}

    const oldProvisioningFileContentObj= {}
    const ugUsers = {}

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

    for (const line of ugFilecontent){
        const [ sis_id, username, email ]= line.split(',')
        ugUsers[sis_id] = {
            sis_id, username, username ,email
        }
    }


    const oldProvisioningFilecontent = fs.readFileSync(oldProvisioningFile, 'utf8')
        .toString()
        .split('\n')

    for (const line of oldProvisioningFilecontent) {
        const [ ,sis_id,login_id,email,,created_by_sis  ]= line.split(',') 

        // Sen: spara de rader som skiljer sig mellan nya o gamla prosisioningfil
        const provisioningObj = provisioningFilecontentObj[sis_id] 
        if( provisioningObj && email !== provisioningObj.email ){            


            const ugUser = ugUsers[sis_id]
            const provisioningUser = provisioningFilecontentObj[sis_id]

            console.log('--------------------', sis_id)
            console.log(`>>>>>> UG: ${ugUser && ugUser.email} `.blue)
            console.log(`>>>>>> Old provisioning: ${ email } `.yellow)
            console.log(`>>>>>> New provisioning: ${ provisioningUser.email } `.yellow)
            console.log()
        } 
    }
} 
diff()
