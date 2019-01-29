const path = require('path')
const fs = require('fs')
const rp = require('request-promise')
const parse = require('csv-parse/lib/sync')
const inquirer = require('inquirer')

const appModes = {
    compareSis: async () => {
        const { comparandCsvFilePath, referenceCsvFilePath } = await inquirer.prompt([
            {
                type: 'input',
                name: 'comparandCsvFilePath',
                message: 'Please enter the relative path name of the csv file to be compared!',
                default: 'csvFiles/canvas-provisioning.csv'
            },
            {
                type: 'input',
                name: 'referenceCsvFilePath',
                message: 'Please enter the relative path name of the csv file of reference!',
                default: 'csvFiles/ug-file.csv'
            }
        ])

        let input = fs.readFileSync(path.resolve(__dirname, comparandCsvFilePath), 'utf8')
        const comparand = parse(input, {
            columns: true,
            skip_empty_lines: true
        })

        input = fs.readFileSync(path.resolve(__dirname, referenceCsvFilePath), 'utf8')
        const reference = parse(input, {
            columns: true,
            skip_empty_lines: true
        })

        console.log('canvas_user_id,user_id')
        for (let cItem of comparand) {
            let matchFound = false
            for (let rItem of reference) {
                if (cItem.user_id === rItem.user_id) {
                    matchFound = true
                    break
                }
            }
            if (!matchFound) {
                console.log(`${cItem.canvas_user_id},${cItem.user_id}`)
            }
        }
    },
    purgeSis: async () => {
        const { relativeCsvFilePath, canvasHostname, accessToken } = await inquirer.prompt([
            {
                type: 'input',
                name: 'relativeCsvFilePath',
                message: 'Please enter the relative path name of the csv file!',
                default: 'csvFiles/purge.csv'
            },
            {
                type: 'list',
                name: 'canvasHostname',
                message: 'Please choose Canvas instance!',
                choices: [
                    {
                        name: 'Production',
                        value: 'https://kth.instructure.com'
                    },
                    {
                        name: 'Test',
                        value: 'https://kth.test.instructure.com'
                    },
                    {
                        name: 'Beta',
                        value: 'https://kth.beta.instructure.com'
                    }
                ]
            },
            {
                type: 'input',
                name: 'accessToken',
                message: 'Please enter access token for the Canvas API!'
            }
        ])

        const input = fs.readFileSync(path.resolve(__dirname, relativeCsvFilePath), 'utf8')

        const records = parse(input, {
            columns: true,
            skip_empty_lines: true
        })

        // If a user is to be edited, we need to fetch their id
        const getOptions = {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            json: true
        }
        const putOptions = {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            formData: {
                'login[sis_user_id]': ''
            },
            json: true
        }
        for (let item of records) {
            try {
                console.debug(`New incorrect user_id found: ${item.user_id}`)
                getOptions.uri = `${canvasHostname}/api/v1/users/${item.canvas_user_id}/logins`
                let logins = await rp(getOptions)
                for (let entry of logins) {
                    if (entry.sis_user_id === item.user_id) {
                        try {
                            console.info(`Will update id ${entry.id} thas has sis id ${entry.sis_user_id}`)
                            putOptions.uri = `${canvasHostname}/api/v1/accounts/1/logins/${entry.id}`
                            let loginEditResult = await rp(putOptions)
                            console.debug(`Result of update: ${JSON.stringify(loginEditResult)}`)
                        } catch (putError) {
                            console.error(`An error occured when trying to update the user with user_id ${item.user_id}`)
                            console.error(putError)
                        }
                    }
                }
            } catch (getError) {
                console.error(`An error occured when trying to get the user with canvas_user_id ${item.canvas_user_id}`)
                console.error(getError)
            }
        }
    },
    deleteUsers: async () => {
        const { relativeCsvFilePath, canvasHostname, accessToken } = await inquirer.prompt([
            {
                type: 'input',
                name: 'relativeCsvFilePath',
                message: 'Please enter the relative path name of the csv file!',
                default: 'csvFiles/delete.csv'
            },
            {
                type: 'list',
                name: 'canvasHostname',
                message: 'Please choose Canvas instance!',
                choices: [
                    {
                        name: 'Production',
                        value: 'https://kth.instructure.com'
                    },
                    {
                        name: 'Test',
                        value: 'https://kth.test.instructure.com'
                    },
                    {
                        name: 'Beta',
                        value: 'https://kth.beta.instructure.com'
                    }
                ]
            },
            {
                type: 'input',
                name: 'accessToken',
                message: 'Please enter access token for the Canvas API!'
            }
        ])

        const input = fs.readFileSync(path.resolve(__dirname, relativeCsvFilePath), 'utf8')

        const records = parse(input, {
            columns: true,
            skip_empty_lines: true
        })

        const deleteOptions = {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            json: true
        }
        for (let item of records) {
            try {
                console.info(`Found a user to delete with canvas_user_id: ${item.canvas_user_id}`)
                deleteOptions.uri = `${canvasHostname}/api/v1/accounts/1/users/${item.canvas_user_id}`
                let deleteResult = await rp(deleteOptions)
                console.debug(`Result of deletion: ${JSON.stringify(deleteResult)}`)
            } catch (deleteError) {
                console.error(`An error occured when trying to delete the user with canvas_user_id ${item.canvas_user_id}`)
                console.error(deleteError)
            }
        }
    }
}

async function csvApp () {
    const { selectedMode } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedMode',
            message: 'Please choose modus operandi!',
            choices: [
                {
                    name: 'Compare two csv-files based on sis id',
                    value: 'compareSis'
                },
                {
                    name: 'Purge invalid sis id:s',
                    value: 'purgeSis'
                },
                {
                    name: 'Delete users',
                    value: 'deleteUsers'
                }
            ]
        }
    ])
    appModes[selectedMode]()
}

csvApp()
