const path = require('path')
const fs = require('fs')
const got = require('got')
const parse = require('csv-parse/lib/sync')
const inquirer = require('inquirer')
const FormData = require('form-data')
const form = new FormData()

function generateSchoolData (externalTool, eTFRecords, aDRecords, schoolMap) {
  const accountId = eTFRecords.find(
    record => record.external_tool_activation_id === externalTool.id
  ).course_account_id
  const accountName = aDRecords
    .find(record => record.id === accountId)
    .name.split(' ')[0]
  let schoolAndStudentCount = [1, 0]
  if (schoolMap.has(accountName)) {
    schoolAndStudentCount = schoolMap.get(accountName)
    schoolAndStudentCount[0] = schoolAndStudentCount[0] + 1
  }
  schoolMap.set(accountName, schoolAndStudentCount)
  externalTool.accountName = accountName
}

const appModes = {
  compareSis: async () => {
    const {
      comparandCsvFilePath,
      referenceCsvFilePath
    } = await inquirer.prompt([
      {
        type: 'input',
        name: 'comparandCsvFilePath',
        message:
          'Please enter the relative path name of the csv file to be compared!',
        default: 'csvFiles/canvas-provisioning.csv'
      },
      {
        type: 'input',
        name: 'referenceCsvFilePath',
        message:
          'Please enter the relative path name of the csv file of reference!',
        default: 'csvFiles/ug-file.csv'
      }
    ])

    let input = fs.readFileSync(
      path.resolve(__dirname, comparandCsvFilePath),
      'utf8'
    )
    const comparand = parse(input, {
      columns: true,
      skip_empty_lines: true
    })

    input = fs.readFileSync(
      path.resolve(__dirname, referenceCsvFilePath),
      'utf8'
    )
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
    const {
      relativeCsvFilePath,
      canvasHostname,
      accessToken
    } = await inquirer.prompt([
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

    const input = fs.readFileSync(
      path.resolve(__dirname, relativeCsvFilePath),
      'utf8'
    )

    const records = parse(input, {
      columns: true,
      skip_empty_lines: true
    })

    // If a user is to be edited, we need to fetch their id
    const getOptions = {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      json: true
    }
    form.append('login[sis_user_id]', '')
    const putOptions = {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: form
    }
    for (let item of records) {
      try {
        console.debug(`New incorrect user_id found: ${item.user_id}`)
        getOptions.url = `${canvasHostname}/api/v1/users/${
          item.canvas_user_id
        }/logins`
        let { body: logins } = await got(getOptions)
        for (let entry of logins) {
          if (entry.sis_user_id === item.user_id) {
            try {
              console.info(
                `Will update id ${entry.id} thas has sis id ${
                  entry.sis_user_id
                }`
              )
              putOptions.url = `${canvasHostname}/api/v1/accounts/1/logins/${
                entry.id
              }`
              let { body: loginEditResult } = await got(putOptions)
              console.debug(
                `Result of update: ${JSON.stringify(loginEditResult)}`
              )
            } catch (putError) {
              console.error(
                `An error occured when trying to update the user with user_id ${
                  item.user_id
                }`
              )
              console.error(putError)
            }
          }
        }
      } catch (getError) {
        console.error(
          `An error occured when trying to get the user with canvas_user_id ${
            item.canvas_user_id
          }`
        )
        console.error(getError)
      }
    }
  },
  deleteUsers: async () => {
    const {
      relativeCsvFilePath,
      canvasHostname,
      accessToken
    } = await inquirer.prompt([
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

    const input = fs.readFileSync(
      path.resolve(__dirname, relativeCsvFilePath),
      'utf8'
    )

    const records = parse(input, {
      columns: true,
      skip_empty_lines: true
    })

    const deleteOptions = {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      json: true
    }
    for (let item of records) {
      try {
        console.info(
          `Found a user to delete with canvas_user_id: ${item.canvas_user_id}`
        )
        deleteOptions.url = `${canvasHostname}/api/v1/accounts/1/users/${
          item.canvas_user_id
        }`
        let { body: deleteResult } = await got(deleteOptions)
        console.debug(`Result of deletion: ${JSON.stringify(deleteResult)}`)
      } catch (deleteError) {
        console.error(
          `An error occured when trying to delete the user with canvas_user_id ${
            item.canvas_user_id
          }`
        )
        console.error(deleteError)
      }
    }
  },
  gatherMWKStatistics: async () => {
    const {
      relativeETDDataPath,
      relativeEDataFolder,
      relativeETFDataPath,
      relativeADataPath
    } = await inquirer.prompt([
      {
        type: 'input',
        name: 'relativeETDDataPath',
        message:
          'Please enter the relative path name of the external tools dim file!',
        default: 'dataFiles/1171-external_tool_activation_dim-00000-ccf628c9'
      },
      {
        type: 'input',
        name: 'relativeEDataFolder',
        message:
          'Please enter the relative folder name where the enrollments files are stored!',
        default: 'dataFiles'
      },
      {
        type: 'input',
        name: 'relativeETFDataPath',
        message:
          'Please enter the relative path name of the external tools fact file!',
        default: 'dataFiles/1171-external_tool_activation_fact-00000-78616e2a'
      },
      {
        type: 'input',
        name: 'relativeADataPath',
        message: 'Please enter the relative path name of the account file!',
        default: 'dataFiles/1171-account_dim-00000-4842795c'
      }
    ])

    let input = fs.readFileSync(
      path.resolve(__dirname, relativeETDDataPath),
      'utf8'
    )
    const eTDRecords = parse(input, {
      delimiter: '\t',
      quote: false,
      columns: [
        'id',
        'canvas_id',
        'course_id',
        'account_id',
        'activation_target_type',
        'url',
        'name',
        'description',
        'workflow_state',
        'privacy_level',
        'created_at',
        'updated_at',
        'tool_id',
        'selectable_all'
      ],
      skip_empty_lines: true
    })

    const filesInEnrollmentsDir = fs.readdirSync(
      path.resolve(__dirname, relativeEDataFolder),
      'utf8'
    )
    console.debug(`Files in enrollments directory: ${filesInEnrollmentsDir}`)
    const enrollmentsFilenames = filesInEnrollmentsDir.filter(item =>
      item.startsWith('1171-enrollment_dim')
    )
    console.debug(`Relevant enrollments files: ${enrollmentsFilenames}`)
    const multipleERecords = []
    for (const enrollmentsFilename of enrollmentsFilenames) {
      input = fs.readFileSync(
        path.resolve(
          __dirname,
          `${relativeEDataFolder}/${enrollmentsFilename}`
        ),
        'utf8'
      )
      multipleERecords.push(
        parse(input, {
          delimiter: '\t',
          quote: false,
          columns: [
            'id',
            'canvas_id',
            'root_account_id',
            'course_section_id',
            'role_id',
            'type',
            'workflow_state',
            'created_at',
            'updated_at',
            'start_at',
            'end_at',
            'completed_at',
            'self_enrolled',
            'sis_source_id',
            'course_id',
            'user_id',
            'last_activity_at'
          ],
          skip_empty_lines: true
        })
      )
    }

    input = fs.readFileSync(
      path.resolve(__dirname, relativeETFDataPath),
      'utf8'
    )
    const eTFRecords = parse(input, {
      delimiter: '\t',
      quote: false,
      columns: [
        'external_tool_activation_id',
        'course_id',
        'account_id',
        'root_account_id',
        'enrollment_term_id',
        'course_account_id'
      ],
      skip_empty_lines: true
    })

    input = fs.readFileSync(path.resolve(__dirname, relativeADataPath), 'utf8')
    const aDRecords = parse(input, {
      delimiter: '\t',
      quote: false,
      columns: [
        'id',
        'canvas_id',
        'name',
        'depth',
        'workflow_state',
        'parent_account',
        'parent_account_id',
        'grandparent_account',
        'grandparent_account_id',
        'root_account',
        'root_account_id',
        'subaccount1',
        'subaccount1_id',
        'subaccount2',
        'subaccount2_id',
        'subaccount3',
        'subaccount3_id',
        'subaccount4',
        'subaccount4_id',
        'subaccount5',
        'subaccount5_id',
        'subaccount6',
        'subaccount6_id',
        'subaccount7',
        'subaccount7_id',
        'subaccount8',
        'subaccount8_id',
        'subaccount9',
        'subaccount9_id',
        'subaccount10',
        'subaccount10_id',
        'subaccount11',
        'subaccount11_id',
        'subaccount12',
        'subaccount12_id',
        'subaccount13',
        'subaccount13_id',
        'subaccount14',
        'subaccount14_id',
        'subaccount15',
        'subaccount15_id',
        'sis_source_id'
      ],
      skip_empty_lines: true
    })

    // ToDo: Group data based on school (i.e. subaccount)
    const moebiusRecords = []
    const moebiusSchoolMap = new Map()

    const wirisRecords = []
    const wirisSchoolMap = new Map()

    for (const externalTool of eTDRecords) {
      if (
        externalTool.activation_target_type === 'course' &&
        externalTool.workflow_state === 'active'
      ) {
        if (externalTool.url.includes('kth-mobius.mapleserver.com')) {
          generateSchoolData(
            externalTool,
            eTFRecords,
            aDRecords,
            moebiusSchoolMap
          )
          moebiusRecords.push(externalTool)
        } else if (externalTool.url.includes('wiris.net')) {
          generateSchoolData(
            externalTool,
            eTFRecords,
            aDRecords,
            wirisSchoolMap
          )
          wirisRecords.push(externalTool)
        }
      }
    }

    let moebiusNumberOfEnrolledUsers = 0
    for (const mRecord of moebiusRecords) {
      const uniqueStudentsInCourse = new Map()
      for (const eRecords of multipleERecords) {
        for (const eRecord of eRecords) {
          if (
            eRecord.course_id === mRecord.course_id &&
            (eRecord.workflow_state === 'active' ||
              eRecord.workflow_state === 'completed') &&
            eRecord.type === 'StudentEnrollment'
          ) {
            uniqueStudentsInCourse.set(eRecord.user_id)
          }
        }
      }
      moebiusNumberOfEnrolledUsers += uniqueStudentsInCourse.size
      const schoolAndStudentCount = moebiusSchoolMap.get(mRecord.accountName)
      schoolAndStudentCount[1] =
        schoolAndStudentCount[1] + uniqueStudentsInCourse.size
    }

    let wirisNumberOfEnrolledUsers = 0
    for (const mRecord of wirisRecords) {
      const uniqueStudentsInCourse = new Map()
      for (const eRecords of multipleERecords) {
        for (const eRecord of eRecords) {
          if (
            eRecord.course_id === mRecord.course_id &&
            (eRecord.workflow_state === 'active' ||
              eRecord.workflow_state === 'completed') &&
            eRecord.type === 'StudentEnrollment'
          ) {
            uniqueStudentsInCourse.set(eRecord.user_id)
          }
        }
      }
      wirisNumberOfEnrolledUsers += uniqueStudentsInCourse.size
      const schoolAndStudentCount = wirisSchoolMap.get(mRecord.accountName)
      schoolAndStudentCount[1] =
        schoolAndStudentCount[1] + uniqueStudentsInCourse.size
    }

    // Present data
    // Möbius
    console.info(`Number of courses with Möbius LTI: ${moebiusRecords.length}`)
    console.info('Courses grouped by school:')
    for (const [key, value] of moebiusSchoolMap) {
      console.info(`${key} = ${value[0]}`)
    }
    console.info(
      `Number of students exposed to Möbius: ${moebiusNumberOfEnrolledUsers}`
    )
    for (const [key, value] of moebiusSchoolMap) {
      console.info(`${key} = ${value[1]}`)
    }
    // New segment
    console.info('===')
    // Wiris
    console.info(`Number of courses with Wiris LTI: ${wirisRecords.length}`)
    console.info('Courses grouped by school:')
    for (const [key, value] of wirisSchoolMap) {
      console.info(`${key} = ${value[0]}`)
    }
    console.info(
      `Number of students exposed to Wiris: ${wirisNumberOfEnrolledUsers}`
    )
    for (const [key, value] of wirisSchoolMap) {
      console.info(`${key} = ${value[1]}`)
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
        },
        {
          name: 'Gather Möbius, Wiris and Kaltura statistics',
          value: 'gatherMWKStatistics'
        }
      ]
    }
  ])
  appModes[selectedMode]()
}

csvApp()
