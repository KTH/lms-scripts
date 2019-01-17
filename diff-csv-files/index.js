const fs = require('fs')
require('colors')
async function diff(){
    const ugFile = 'all-ug-users.csv'
    const provisioningFile = 'provisioning_csv_17_Jan_2019_15920190117-6270-tij52n.csv'
    const oldProvisioningFile = 'provisioning_csv_06_Aug_2018_11620180806-31721-r7puwy.csv'

    const provisioningFilecontentObj = {}
    const diffingProvisioningFileContentObj= {}
    const oldProvisioningFileContentObj= {}

    const provisioningFilecontent = fs.readFileSync(provisioningFile, 'utf8')
        .toString()
        .split('\n')

    for (const line of provisioningFilecontent) {
        const [ ,sis_id,,,login_id,,,,,email,,created_by_sis  ]= line.split(',') 
        provisioningFilecontentObj[sis_id] = {
            sis_id, login_id,email,created_by_sis
        }
    }

    const oldProvisioningFilecontent = fs.readFileSync(oldProvisioningFile, 'utf8')
        .toString()
        .split('\n')

    for (const line of oldProvisioningFilecontent) {
        const [ ,sis_id,login_id,email,,created_by_sis  ]= line.split(',') 

        // Först spara alla rader från denna fil som key value
        oldProvisioningFileContentObj[sis_id] = {
            sis_id, login_id,email,created_by_sis
        }

        // Sen: spara de rader som skiljer sig mellan nya o gamla prosisioningfil
        const provisioningObj = provisioningFilecontentObj[sis_id] 
        if( provisioningObj && email !== provisioningObj.email ){            
            diffingProvisioningFileContentObj[sis_id]={
                sis_id, login_id,email,created_by_sis
            }
        } 
    }

    const ugFilecontent = fs.readFileSync(ugFile, 'utf8')
        .toString()
        .split('\n')

    let diffingEmailsUgOldProv = 0 
    for (const line of ugFilecontent){
        const [ sis_id, username, email ]= line.split(',')
        const oldProvObj = oldProvisioningFileContentObj[sis_id]

        /*if(
            oldProvObj && email &&
            email !== oldProvObj.email
        ){
            diffingEmailsUgOldProv++
                console.log('-----------------')
                console.log('sisid: ',sis_id)
                console.log('Email skiljer sig mellan gamla provisioning och ug: ')
                console.log(email.blue, oldProvObj.email.yellow)
        }
        */
        const provisioningObj = provisioningFilecontentObj[sis_id] 
        const diffingObj = diffingProvisioningFileContentObj[sis_id]
        if(

            diffingObj &&
            provisioningObj &&
            email !== provisioningObj.email
        ){
            // Alla users som diffar mellan ug och canvas
            //i++
            console.log('-----------------')
            console.log(`<<< Canvas: ${provisioningObj.email}`.yellow)
            console.log(`<<< Augusti: ${diffingObj.email}`.yellow,)
            console.log(`>>>     UG: ${email}`.blue)
        }
    }
    //console.log('Totalt antal användare med olika epost mellan ug och gamla provisioning: ', diffingEmailsUgOldProv)

} 
diff()
