const fs = require('fs')
const convert = require('xml-js')
const inquirer = require('inquirer')

async function getCourseID () {
  await inquirer
    .prompt({
      type: 'input',
      name: 'courseID',
      message: 'Provide Canvas CourseID (https://canvas.kth.se/courses/XXX):',
      default: '9298',
      validate: function (answer) {
        if (answer.length < 1) {
          return 'You must specify the search term!'
        }
        return true
      }
    })
    .then(answers => {
      generateSEBConfig(answers.courseID)
    })
}

function generateSEBConfig (courseID) {
  const xml = fs.readFileSync('SebClientSettings.seb', 'utf8') // open the .seb file and convert to json
  const readOptions = { ignoreComment: false, alwaysChildren: true }
  const sebConfig = convert.xml2js(xml, readOptions)
  let ruleString = ''
  const ruleArr = []

  // here we have full regex whitelist for urls
  const regexArr = ['([\\w\\d]+\\.)?canvas\\.kth\\.se(\\/)?$', `([\\w\\d]+\\.)?canvas\\.kth\\.se\\/courses\\/${courseID}$`, `([\\w\\d]+\\.)?canvas\\.kth\\.se\\/courses\\/${courseID}\\/assignments(\\/.*)?$`, `([\\w\\d]+\\.)?canvas\\.kth\\.se\\/courses\\/${courseID}\\/external_tools\\/retrieve\\?display=full_width&url=https%3A%2F%2Fkth.quiz-lti-dub-prod.instructure.com(.*)?$`, `([\\w\\d]+\\.)?canvas\\.kth\\.se\\/courses\\/${courseID}\\/modules(\\/.*)?$`, `([\\w\\d]+\\.)?canvas\\.kth\\.se\\/courses\\/${courseID}\\/modules/items/([0-9]+)?$`, `([\\w\\d]+\\.)?canvas\\.kth\\.se\\/courses\\/${courseID}\\/modules\\#module_([0-9]+)$`, `([\\w\\d]+\\.)?canvas\\.kth\\.se\\/courses\\/${courseID}\\/pages\\/([a-zA-Z0-9_.-]+)\\?module_item_id=([0-9]+)$`, `([\\w\\d]+\\.)?canvas\\.kth\\.se\\/courses\\/${courseID}\\/quizzes(\\/.*)?$`, `([\\w\\d]+\\.)?canvas\\.kth\\.se\\/courses\\/${courseID}\\/student_view(\\/.*)?$`, `([\\w\\d]+\\.)?canvas\\.kth\\.se\\/courses\\/${courseID}\\/test_student(\\/.*)?$`, '([\\w\\d]+\\.)?canvas\\.kth\\.se\\/login(\\/.*)?$', '([\\w\\d]+\\.)?kth\\.mobius\\.cloud(\\/.*)?$', '([\\w\\d]+\\.)?login\\.sys\\.kth\\.se(\\/.*)?$', '([\\w\\d]+\\.)?login\\.ug\\.kth\\.se(\\/.*)?$', '([\\w\\d]+\\.)?saml-5\\.sys\\.kth\\.se(\\/.*)?$', '([\\w\\d]+\\.)?saml-5\\.ug\\.kth\\.se(\\/.*)?$', '([\\w\\d]+\\.)?sso\\.canvaslms\\.com\\/delegated_auth_pass_through\\?target=(.*)$', '([\\w\\d]+\\.)?canvas\\.kth\\.se\\/courses(\\/[0-9]+)\\/files\\/([a-zA-Z0-9_.-]+)\\?module_item_id=([0-9]+)$']

  const stencilRuleObj = {
    type: 'element',
    name: 'dict',
    elements: [
      { type: 'element', name: 'key', elements: [{ type: 'text', text: 'active' }] },
      { type: 'element', name: 'true', elements: [] },
      { type: 'element', name: 'key', elements: [{ type: 'text', text: 'regex' }] },
      { type: 'element', name: 'true', elements: [] },
      { type: 'element', name: 'key', elements: [{ type: 'text', text: 'expression' }] },
      { type: 'element', name: 'string', elements: [{ type: 'text', text: '' }] }, // regex expression goes here
      { type: 'element', name: 'key', elements: [{ type: 'text', text: 'action' }] },
      { type: 'element', name: 'integer', elements: [{ type: 'text', text: '1' }] }
    ]
  }
  sebConfig.elements[1].elements[0].elements[3].elements[0].text = `https://canvas.kth.se/courses/${courseID}`// SEB start url
  sebConfig.elements[1].elements[0].elements[237].elements = [] // purge existing rules in the config file (so we can write them sequentially)

  for (let i = 0; i < regexArr.length; i++) { // add rules from regexArr using stencilRuleObj format
    const rule = JSON.parse(JSON.stringify(stencilRuleObj))
    rule.elements[5].elements[0].text = regexArr[i]
    sebConfig.elements[1].elements[0].elements[237].elements.push(rule) // push to array that was purged earlier
  }

  for (let i = 0; i < sebConfig.elements[1].elements[0].elements[237].elements.length; i++) { // there's also a field that contains all active rules, separated by semicolons, so we generete that here
    ruleArr.push(sebConfig.elements[1].elements[0].elements[237].elements[i].elements[5].elements[0].text)
    ruleString = ruleArr.join(';')
  }

  sebConfig.elements[1].elements[0].elements[245].elements[0].text = ruleString // and overwrite the single string here

  writeXML(sebConfig, courseID)
}

function writeXML (source, courseID) {
  // write xml to file
  const writeOptions = { compact: false, ignoreComment: false, spaces: 2, fullTagEmptyElement: true } // write full xml, even if some tags are empty
  const sebConfigName = `SebClientSettings-${courseID}`
  const file = convert.js2xml(source, writeOptions)
  const path = `./${sebConfigName}.seb`
  const buffer = Buffer.from(file, 'utf-8')
  fs.open(path, 'w', function (e, fd) {
    if (e) {
      console.error(`XML FILE ERR: ${e}`)
    }
    fs.write(fd, buffer, 0, buffer.length, null, function (e) {
      if (e) console.error(`XML WRITE ERROR: ${e}`)
      fs.close(fd, function () {
        console.info(`XML OK: ${sebConfigName}.seb`)
      })
    })
  })
}

function start () {
  getCourseID()
}

start()
