const inquirer = require('inquirer')
const fs = require('fs')
const path = require('path')
const parse = require('csv-parse/lib/sync')

function generateExternalToolSchoolData (
  externalTool,
  eTFRecords,
  aDRecords,
  schoolMap
) {
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

function generateCourseSchoolData (course, aDRecords, schoolMap) {
  let accountName = aDRecords
    .find(record => record.id === course.account_id)
    .name.split(' ')[0]
  let schoolAndStudentCount = [1, 0]
  if (schoolMap.has(accountName)) {
    schoolAndStudentCount = schoolMap.get(accountName)
    schoolAndStudentCount[0] = schoolAndStudentCount[0] + 1
  }
  schoolMap.set(accountName, schoolAndStudentCount)
  course.accountName = accountName
}

module.exports = async function () {
  const {
    relativeETDDataPath,
    relativeEDataFolder,
    relativeETFDataPath,
    relativeADataPath,
    relativeCDDataPath,
    relativeKDataPath
  } = await inquirer.prompt([
    {
      type: 'input',
      name: 'relativeETDDataPath',
      message:
        'Please enter the relative path name of the external tools dim file!',
      default: '../dataFiles/1178-external_tool_activation_dim-00000-aa36c1cc'
    },
    {
      type: 'input',
      name: 'relativeEDataFolder',
      message:
        'Please enter the relative folder name where the enrollments files are stored!',
      default: '../dataFiles'
    },
    {
      type: 'input',
      name: 'relativeETFDataPath',
      message:
        'Please enter the relative path name of the external tools fact file!',
      default: '../dataFiles/1178-external_tool_activation_fact-00000-a33837c6'
    },
    {
      type: 'input',
      name: 'relativeADataPath',
      message: 'Please enter the relative path name of the account file!',
      default: '../dataFiles/1178-account_dim-00000-806a4e36'
    },
    {
      type: 'input',
      name: 'relativeCDDataPath',
      message: 'Please enter the relative path name of the course file!',
      default: '../dataFiles/1178-course_dim-00000-21c9b766'
    },
    {
      type: 'input',
      name: 'relativeKDataPath',
      message: 'Please enter the relative path name of the Kaltura file!',
      default: '../dataFiles/kaltura_videos.csv'
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
    item.startsWith('1178-enrollment_dim')
  )
  console.debug(`Relevant enrollments files: ${enrollmentsFilenames}`)
  const multipleERecords = []
  for (const enrollmentsFilename of enrollmentsFilenames) {
    input = fs.readFileSync(
      path.resolve(__dirname, `${relativeEDataFolder}/${enrollmentsFilename}`),
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

  input = fs.readFileSync(path.resolve(__dirname, relativeETFDataPath), 'utf8')
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

  input = fs.readFileSync(path.resolve(__dirname, relativeCDDataPath), 'utf8')
  const cDRecords = parse(input, {
    delimiter: '\t',
    quote: false,
    columns: [
      'id',
      'canvas_id',
      'root_account_id',
      'account_id',
      'enrollment_term_id',
      'name',
      'code',
      'type',
      'created_at',
      'start_at',
      'conclude_at',
      'publicly_visible',
      'sis_source_id',
      'workflow_state',
      'wiki_id',
      'syllabus_body'
    ],
    skip_empty_lines: true
  })

  input = fs.readFileSync(path.resolve(__dirname, relativeKDataPath), 'utf8')
  const kRecords = parse(input, {
    delimiter: ';',
    quote: false,
    columns: true,
    skip_empty_lines: true
  })

  const moebiusRecords = []
  const moebiusSchoolMap = new Map()

  const wirisRecords = []
  const wirisSchoolMap = new Map()

  const kalturaRecords = []
  const kalturaSchoolMap = new Map()

  for (const externalTool of eTDRecords) {
    if (
      externalTool.activation_target_type === 'course' &&
      externalTool.workflow_state === 'active'
    ) {
      if (externalTool.url.includes('kth-mobius.mapleserver.com')) {
        generateExternalToolSchoolData(
          externalTool,
          eTFRecords,
          aDRecords,
          moebiusSchoolMap
        )
        moebiusRecords.push(externalTool)
      } else if (externalTool.url.includes('wiris.net')) {
        generateExternalToolSchoolData(
          externalTool,
          eTFRecords,
          aDRecords,
          wirisSchoolMap
        )
        wirisRecords.push(externalTool)
      }
    }
  }

  for (const kRecord of kRecords) {
    const course = cDRecords.find(
      cDRecord => cDRecord.canvas_id === kRecord.CourseID
    )
    generateCourseSchoolData(course, aDRecords, kalturaSchoolMap)
    kalturaRecords.push(course)
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

  let kalturaNumberOfEnrolledUsers = 0
  for (const kRecord of kalturaRecords) {
    const uniqueStudentsInCourse = new Map()
    for (const eRecords of multipleERecords) {
      for (const eRecord of eRecords) {
        if (
          eRecord.course_id === kRecord.id &&
          (eRecord.workflow_state === 'active' ||
            eRecord.workflow_state === 'completed') &&
          eRecord.type === 'StudentEnrollment'
        ) {
          uniqueStudentsInCourse.set(eRecord.user_id)
        }
      }
    }
    kalturaNumberOfEnrolledUsers += uniqueStudentsInCourse.size
    const schoolAndStudentCount = kalturaSchoolMap.get(kRecord.accountName)
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
  console.info('Students grouped by school:')
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
  console.info('Students grouped by school:')
  for (const [key, value] of wirisSchoolMap) {
    console.info(`${key} = ${value[1]}`)
  }
  // New segment
  console.info('===')
  // Kaltura
  console.info(
    `Number of courses with Media Gallery and/or embedded from Kaltura: ${
      kalturaRecords.length
    }`
  )
  console.info('Courses grouped by school:')
  for (const [key, value] of kalturaSchoolMap) {
    console.info(`${key} = ${value[0]}`)
  }
  console.info(
    `Number of students exposed to Kaltura: ${kalturaNumberOfEnrolledUsers}`
  )
  console.info('Students grouped by school:')
  for (const [key, value] of kalturaSchoolMap) {
    console.info(`${key} = ${value[1]}`)
  }
}
