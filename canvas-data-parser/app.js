// Note: Using just an async construction here for ease of use.
(async () => {
  require('dotenv').config()
  const bunyan = require('bunyan')
  const {exec} = require('child_process')

  // Note: For info about data tables, check out this resource: https://portal.inshosteddata.com/docs
  async function courseDataIdToName (courseId) {
    try {
      const result = await new Promise((resolve, reject) => {
        exec(`rg ${courseId} ${baseUrl}/course_dim -z`, {
          maxBuffer: 20000 * 1024
        }, (error, stdout, stderr) => {
          if (error) {
            logger.error(`courseDataIdToName exec error: ${error}`)
            reject(error)
            return
          }
          logger.debug(`stdout: ${stdout}`)
          logger.debug(`stderr: ${stderr}`)
          resolve(stdout)
        })
      })
      logger.debug(`got rg courseId result: ${result}`)
      // Note: Gotta make sure we hit the correct column
      const resultsArray = result.split('\n')
      for (let row of resultsArray) {
        const rowArray = row.split('\t')
        if (rowArray[0].includes(courseId)) {
          courseNameIdMap.set(rowArray[5], courseId)
          return rowArray[5]
        }
      }
      throw new Error(`no course found for courseId: ${courseId}`)
    } catch (err) {
      logger.error(`rg promise error in courseDataIdToName: ${err}`)
    }
  }

  async function groupDataIdToName (groupId) {
    try {
      const result = await new Promise((resolve, reject) => {
        exec(`rg ${groupId} ${baseUrl}/group_dim -z`, {
          maxBuffer: 20000 * 1024
        }, (error, stdout, stderr) => {
          if (error) {
            logger.error(`groupDataIdToName exec error: ${error}`)
            reject(error)
            return
          }
          logger.debug(`stdout: ${stdout}`)
          logger.debug(`stderr: ${stderr}`)
          resolve(stdout)
        })
      })
      logger.debug(`got rg groupId result: ${result}`)
      // Note: Simply assuming that the first hit is "the one hit"!
      const sisSourceId = result.split('\n')[0].split('\t')[14]
      logger.debug(`found sisSourceId for course: ${sisSourceId}!`)
      return courseDataIdToName(sisSourceId)
    } catch (err) {
      logger.error(`rg promise error in groupDataIdToName: ${err}`)
    }
  }

  async function wikiPageIdToName (wikiPageId) {
    try {
      const result = await new Promise((resolve, reject) => {
        exec(`rg ${wikiPageId} ${baseUrl}/wiki_page_fact -z`, {
          maxBuffer: 2000 * 1024
        }, (error, stdout, stderr) => {
          if (error) {
            logger.error(`wikiPageIdToName exec error: ${error}`)
            reject(error)
            return
          }
          logger.debug(`stdout: ${stdout}`)
          logger.debug(`stderr: ${stderr}`)
          resolve(stdout)
        })
      })
      logger.debug(`got rg wikiPageId result: ${result}`)
      const resultArray = result.split('\n')
      // Note: Simply assuming that the first hit is "the one hit"!
      const parentGroupId = resultArray[0].split('\t')[3]
      const parentCourseId = resultArray[0].split('\t')[2]
      logger.debug(`found parentGroupId: ${parentGroupId} and parentCourseId: ${parentCourseId}`)
      if (parentCourseId && parentCourseId !== 'false' && parentCourseId !== '\\N') {
        return courseDataIdToName(parentCourseId)
      } else if (parentGroupId && parentGroupId !== 'false') {
        return groupDataIdToName(parentGroupId)
      } else if (resultArray.length > 1) {
        logger.warn(`no valid id found for result: ${result}`)
      }
      throw new Error(`no course found for wikiPageId: ${wikiPageId}`)
    } catch (err) {
      logger.error(`rg promise error in wikiPageIdToName: ${err}`)
    }
  }

  async function subComIdToName (subComId) {
    try {
      const result = await new Promise((resolve, reject) => {
        exec(`rg ${subComId} ${baseUrl}/submission_comment_fact -z`, {
          maxBuffer: 2000 * 1024
        }, (error, stdout, stderr) => {
          if (error) {
            logger.error(`subComIdToName exec error: ${error}`)
            reject(error)
            return
          }
          logger.debug(`stdout: ${stdout}`)
          logger.debug(`stderr: ${stderr}`)
          resolve(stdout)
        })
      })
      logger.debug(`got rg subComId result: ${result}`)
      const resultArray = result.split('\n')
      // Note: Simply assuming that the first hit is "the one hit"!
      const courseId = resultArray[0].split('\t')[5]
      logger.debug(`found courseId: ${courseId}`)
      return courseDataIdToName(courseId)
    } catch (err) {
      logger.error(`rg promise error in subComIdToName: ${err}`)
    }
  }

  async function quizIdToName (quizId) {
    try {
      const result = await new Promise((resolve, reject) => {
        exec(`rg ${quizId} ${baseUrl}/quiz_dim -z`, {
          maxBuffer: 2000 * 1024
        }, (error, stdout, stderr) => {
          if (error) {
            logger.error(`quizIdToName exec error: ${error}`)
            reject(error)
            return
          }
          logger.debug(`stdout: ${stdout}`)
          logger.debug(`stderr: ${stderr}`)
          resolve(stdout)
        })
      })
      logger.debug(`got rg quizId result: ${result}`)
      const resultArray = result.split('\n')
      // Note: Simply assuming that the first hit is "the one hit"!
      const courseId = resultArray[0].split('\t')[7]
      logger.debug(`found courseId: ${courseId}`)
      return courseDataIdToName(courseId)
    } catch (err) {
      logger.error(`rg promise error in quizIdToName: ${err}`)
    }
  }

  async function discEntryIdToName (discEntryId) {
    try {
      const result = await new Promise((resolve, reject) => {
        exec(`rg ${discEntryId} ${baseUrl}/discussion_entry_fact -z`, {
          maxBuffer: 2000 * 1024
        }, (error, stdout, stderr) => {
          if (error) {
            logger.error(`discEntryIdToName exec error: ${error}`)
            reject(error)
            return
          }
          logger.debug(`stdout: ${stdout}`)
          logger.debug(`stderr: ${stderr}`)
          resolve(stdout)
        })
      })
      logger.debug(`got rg discEntryId result: ${result}`)
      const resultArray = result.split('\n')
      // Note: Simply assuming that the first hit is "the one hit"!
      const courseId = resultArray[0].split('\t')[4]
      logger.debug(`found courseId: ${courseId}`)
      return courseDataIdToName(courseId)
    } catch (err) {
      logger.error(`rg promise error in discEntryIdToName: ${err}`)
    }
  }

  async function assignmentIdToName (assignmentId) {
    try {
      const result = await new Promise((resolve, reject) => {
        exec(`rg ${assignmentId} ${baseUrl}/assignment_dim -z`, {
          maxBuffer: 2000 * 1024
        }, (error, stdout, stderr) => {
          if (error) {
            logger.error(`assignmentIdToName exec error: ${error}`)
            reject(error)
            return
          }
          logger.debug(`stdout: ${stdout}`)
          logger.debug(`stderr: ${stderr}`)
          resolve(stdout)
        })
      })
      logger.debug(`got rg assignmentId result: ${result}`)
      const resultArray = result.split('\n')
      // Note: Simply assuming that the first hit is "the one hit"!
      const courseId = resultArray[0].split('\t')[2]
      logger.debug(`found courseId: ${courseId}`)
      return courseDataIdToName(courseId)
    } catch (err) {
      logger.error(`rg promise error in assignmentIdToName: ${err}`)
    }
  }

  async function conversationIdToName (conversationId) {
    try {
      const result = await new Promise((resolve, reject) => {
        exec(`rg ${conversationId} ${baseUrl}/conversation_dim -z`, {
          maxBuffer: 2000 * 1024
        }, (error, stdout, stderr) => {
          if (error) {
            logger.error(`conversationIdToName exec error: ${error}`)
            reject(error)
            return
          }
          logger.debug(`stdout: ${stdout}`)
          logger.debug(`stderr: ${stderr}`)
          resolve(stdout)
        })
      })
      logger.debug(`got rg conversationId result: ${result}`)
      const resultArray = result.split('\n')
      // Note: Simply assuming that the first hit is "the one hit"!
      const courseId = resultArray[0].split('\t')[5]
      logger.debug(`found courseId: ${courseId}`)
      return courseDataIdToName(courseId)
    } catch (err) {
      logger.error(`rg promise error in conversationIdToName: ${err}`)
    }
  }

  async function courseIdToTeacherEMails (courseId) {
    try {
      const result = await new Promise((resolve, reject) => {
        exec(`rg ${courseId} ${baseUrl}/enrollment_dim -z`, {
          maxBuffer: 200000 * 1024
        }, (error, stdout, stderr) => {
          if (error) {
            logger.error(`courseIdToTeacherEMails exec error: ${error}`)
            reject(error)
            return
          }
          logger.debug(`stdout: ${stdout}`)
          logger.debug(`stderr: ${stderr}`)
          resolve(stdout)
        })
      })
      logger.debug(`got rg courseId result: ${result}`)
      const resultArray = result.split('\n')
      const eMailSet = new Set()
      for (let row of resultArray) {
        const rowArray = row.split('\t')
        if (courseId === rowArray[14] && rolesOfInterest.has(rowArray[4])) {
          const eMails = await userIdToEMails(rowArray[14])
          eMailSet.add(...eMails)
        }
      }
      return eMailSet
    } catch (err) {
      logger.error(`rg promise error in courseIdToTeacherEMails: ${err}`)
    }
  }

  async function userIdToEMails (userId) {
    try {
      const result = await new Promise((resolve, reject) => {
        exec(`rg ${userId} ${baseUrl}/communication_channel_dim -z`, {
          maxBuffer: 2000 * 1024
        }, (error, stdout, stderr) => {
          if (error) {
            logger.error(`userIdToEMails exec error: ${error}`)
            if (error.code !== 1) {
              reject(error)
              return
            } else {
              logger.error('will ignore error with code 1')
            }
          }
          logger.debug(`stdout: ${stdout}`)
          logger.debug(`stderr: ${stderr}`)
          resolve(stdout)
        })
      })
      logger.debug(`got rg userId result: ${result}`)
      const resultArray = result.split('\n')
      const eMails = []
      for (let row of resultArray) {
        const rowArray = row.split('\t')
        if (rowArray[4] === 'email') {
          eMails.push(rowArray[3])
        }
      }
      return eMails
    } catch (err) {
      logger.error(`rg promise error in userIdToEMails: ${err}`)
    }
  }

  // Note: Got to define which parts of the data are of interest
  const foldersOfInterest = [
    'discussion_topic_dim',
    'module_item_dim',
    'quiz_dim',
    'assignment_dim',
    'wiki_page_dim',
    'course_dim',
    'submission_comment_dim',
    'external_tool_activation_dim',
    'quiz_question_dim',
    'discussion_entry_dim',
    'submission_dim',
    'conversation_message_dim'
  ]

  const rolesOfInterest = new Set([
    '87790000000000009', // Course Responsible
    '87790000000000010', // Examiner
    '87790000000000004' // TeacherEnrollment
  ])

  // Note: Mapping courses based on their friendly name
  // ToDo: Some pretty egregious code duplication going on here. To be improved...
  const findCourses = {
    discussion_topic_dim: async (resultsArray, courseMap) => {
      for (let row of resultsArray) {
        const rowArray = row.split('\t')
        // ToDo: Remove popping, it is silly...
        const groupId = rowArray.pop()
        const courseId = rowArray.pop()
        logger.debug(`found groupId: ${groupId} and courseId: ${courseId}`)
        if (courseId && courseId !== 'false' && courseId !== '\\N') {
          const courseName = await courseDataIdToName(courseId)
          if (!courseMap.get(courseName)) {
            courseMap.set(courseName, 0)
          }
          courseMap.set(courseName, courseMap.get(courseName) + 1)
        } else if (groupId && groupId !== 'false' && groupId !== '\\N') {
          const courseName = await groupDataIdToName(groupId)
          if (!courseMap.get(courseName)) {
            courseMap.set(courseName, 0)
          }
          courseMap.set(courseName, courseMap.get(courseName) + 1)
        } else if (rowArray.length > 1) {
          logger.warn(`no valid id found for row: ${row}`)
        }
      }
    },
    module_item_dim: async (resultsArray, courseMap) => {
      for (let row of resultsArray) {
        const rowArray = row.split('\t')
        const courseId = rowArray[3]
        logger.debug(`found courseId: ${courseId}`)
        if (courseId && courseId !== 'false') {
          const courseName = await courseDataIdToName(courseId)
          if (!courseMap.get(courseName)) {
            courseMap.set(courseName, 0)
          }
          courseMap.set(courseName, courseMap.get(courseName) + 1)
        } else if (rowArray.length > 1) {
          logger.warn(`no valid id found for row: ${row}`)
        }
      }
    },
    quiz_dim: async (resultsArray, courseMap) => {
      for (let row of resultsArray) {
        const rowArray = row.split('\t')
        const courseId = rowArray[7]
        logger.debug(`found courseId: ${courseId}`)
        if (courseId && courseId !== 'false') {
          const courseName = await courseDataIdToName(courseId)
          if (!courseMap.get(courseName)) {
            courseMap.set(courseName, 0)
          }
          courseMap.set(courseName, courseMap.get(courseName) + 1)
        } else if (rowArray.length > 1) {
          logger.warn(`no valid id found for row: ${row}`)
        }
      }
    },
    assignment_dim: async (resultsArray, courseMap) => {
      for (let row of resultsArray) {
        const rowArray = row.split('\t')
        const courseId = rowArray[2]
        logger.debug(`found courseId: ${courseId}!`)
        if (courseId && courseId !== 'false') {
          const courseName = await courseDataIdToName(courseId)
          if (!courseMap.get(courseName)) {
            courseMap.set(courseName, 0)
          }
          courseMap.set(courseName, courseMap.get(courseName) + 1)
        } else if (rowArray.length > 1) {
          logger.warn(`no valid id found for row: ${row}`)
        }
      }
    },
    wiki_page_dim: async (resultsArray, courseMap) => {
      for (let row of resultsArray) {
        const rowArray = row.split('\t')
        const wikiPageId = rowArray[0].split(':')[1]
        logger.debug(`found wikiPageId: ${wikiPageId}`)
        if (wikiPageId && wikiPageId !== 'false' && wikiPageId !== 'undefined') {
          const courseName = await wikiPageIdToName(wikiPageId)
          if (!courseMap.get(courseName)) {
            courseMap.set(courseName, 0)
          }
          courseMap.set(courseName, courseMap.get(courseName) + 1)
        }
      }
    },
    course_dim: async (resultsArray, courseMap) => {
      for (let row of resultsArray) {
        const rowArray = row.split('\t')
        const courseId = rowArray[0].split(':')[1]
        logger.debug(`found courseId: ${courseId}!`)
        if (courseId && courseId !== 'false') {
          const courseName = await courseDataIdToName(courseId)
          if (!courseMap.get(courseName)) {
            courseMap.set(courseName, 0)
          }
          courseMap.set(courseName, courseMap.get(courseName) + 1)
        } else if (rowArray.length > 1) {
          logger.warn(`no valid id found for row: ${row}`)
        }
      }
    },
    submission_comment_dim: async (resultsArray, courseMap) => {
      for (let row of resultsArray) {
        const rowArray = row.split('\t')
        const subComId = rowArray[0].split(':')[1]
        logger.debug(`found subComId: ${subComId}`)
        if (subComId && subComId !== 'false') {
          const courseName = await subComIdToName(subComId)
          if (!courseMap.get(courseName)) {
            courseMap.set(courseName, 0)
          }
          courseMap.set(courseName, courseMap.get(courseName) + 1)
        }
      }
    },
    external_tool_activation_dim: async (resultsArray, courseMap) => {
      // Note: Will only consider entries activated in a course
      for (let row of resultsArray) {
        const rowArray = row.split('\t')
        const courseId = rowArray[2]
        logger.debug(`found courseId: ${courseId}`)
        if (courseId && courseId !== 'false') {
          const courseName = await courseDataIdToName(courseId)
          if (!courseMap.get(courseName)) {
            courseMap.set(courseName, 0)
          }
          courseMap.set(courseName, courseMap.get(courseName) + 1)
        }
      }
    },
    quiz_question_dim: async (resultsArray, courseMap) => {
      for (let row of resultsArray) {
        const rowArray = row.split('\t')
        const quizId = rowArray[2]
        logger.debug(`found quizId: ${quizId}`)
        if (quizId && quizId !== 'false') {
          const courseName = await quizIdToName(quizId)
          if (!courseMap.get(courseName)) {
            courseMap.set(courseName, 0)
          }
          courseMap.set(courseName, courseMap.get(courseName) + 1)
        }
      }
    },
    discussion_entry_dim: async (resultsArray, courseMap) => {
      for (let row of resultsArray) {
        const rowArray = row.split('\t')
        const discEntryId = rowArray[0].split(':')[1]
        logger.debug(`found discEntryId: ${discEntryId}`)
        if (discEntryId && discEntryId !== 'false' && discEntryId !== 'undefined') {
          const courseName = await discEntryIdToName(discEntryId)
          if (!courseMap.get(courseName)) {
            courseMap.set(courseName, 0)
          }
          courseMap.set(courseName, courseMap.get(courseName) + 1)
        }
      }
    },
    submission_dim: async (resultsArray, courseMap) => {
      for (let row of resultsArray) {
        const rowArray = row.split('\t')
        const assignmentId = rowArray[18]
        logger.debug(`found assignmentId: ${assignmentId}`)
        // ToDo: Should revise which checks are relevant here and in other "find-functions"!
        if (assignmentId && assignmentId !== 'false' && assignmentId !== 'undefined') {
          const courseName = await assignmentIdToName(assignmentId)
          if (!courseMap.get(courseName)) {
            courseMap.set(courseName, 0)
          }
          courseMap.set(courseName, courseMap.get(courseName) + 1)
        }
      }
    },
    conversation_message_dim: async (resultsArray, courseMap) => {
      for (let row of resultsArray) {
        const rowArray = row.split('\t')
        const conversationId = rowArray[2]
        logger.debug(`found conversationId: ${conversationId}`)
        if (conversationId && conversationId !== 'false' && conversationId !== 'undefined') {
          const courseName = await conversationIdToName(conversationId)
          if (!courseMap.get(courseName)) {
            courseMap.set(courseName, 0)
          }
          courseMap.set(courseName, courseMap.get(courseName) + 1)
        }
      }
    }
  }

  const logLevel = process.env.BUNYAN_LOG_LEVEL || 'info'
  const logger = bunyan.createLogger({name: 'canvas_data_parser', level: logLevel})

  const baseUrl = process.argv[2]
  logger.debug(`recorded base ${baseUrl}`)

  const courseNameIdMap = new Map()
  const courseMap = new Map()
  for (let folder of foldersOfInterest) {
    try {
      const result = await new Promise((resolve, reject) => {
        exec(`rg "insert string here" ${baseUrl}/${folder} -z`, {
          maxBuffer: 20000 * 1024
        }, (error, stdout, stderr) => {
          if (error) {
            logger.error(`exec error: ${error}`)
            reject(error)
            return
          }
          logger.debug(`stdout: ${stdout}`)
          logger.debug(`stderr: ${stderr}`)
          resolve(stdout)
        })
      })
      logger.debug(`got rg play.kth.se result: ${result}`)
      const resultsArray = result.split('\n')
      await findCourses[folder](resultsArray, courseMap)
    } catch (err) {
      // Note: Very likely the result of "no hits"
      logger.error(`rg promise error: ${err}`)
    }
  }

  const courseArray = [...courseMap].sort((a, b) => {
    return b[1] - a[1]
  })

  const mailNameMap = new Map()
  for (let [name, id] of courseNameIdMap) {
    logger.debug(`finding key persons for courseId: ${id}`)
    const mailSet = await courseIdToTeacherEMails(id)
    mailSet.forEach((item) => {
      if (mailNameMap.has(name)) {
        mailNameMap.set(name, mailNameMap.get(name).push(item))
      } else {
        mailNameMap.set(name, [item])
      }
    })
  }

  logger.info('these are the results of the search \'n\' map!')
  let sum = 0
  courseArray.forEach((element) => {
    logger.info(`|${element[0]}|\t${element[1]}\t${mailNameMap.get(element[0])}`)
    sum += element[1]
  })
  logger.info(`all in all: ${sum}`)
}
)()
