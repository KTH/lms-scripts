require("dotenv").config();
require("@kth/reqvars").check();

// const transferToLadokData = require('./utils/transferToLadokData')
const CanvasApi = require("@kth/canvas-api");
const path = require("path");
const fs = require("fs");

const MATCH_YEAR = process.env.MATCH_YEAR;

const FOLDER_NAME = "output";
// TODO: How should course code filtering work, in general?
const INVALID_COURSE_CODE_CHARACTERS_REGEX = /Sandbox|@|\s|-|_/;
const REDIRECT_URL_PATTERN = /https:\/\/www.edu-apps.org\/redirect/;
const NEW_SCHOOL_MAP = new Map([
  ["BIO", "CBH"],
  ["CSC", "EECS"],
  ["EES", "EECS"],
  ["STH", "CBH"],
  ["ICT", "EECS"],
  ["CHE", "CBH"],
  ["ECE", "ITM"],
  ["UF", "GVS"],
  ["Ω", "OMEGA"],
]);
const SEMESTER_TO_NUMBER = new Map([
  ["VT", 1],
  ["HT", 2],
]);

// For parsing the school name from an account name
function getSchoolName(accountName) {
  const splitAccountName = accountName.split(" ");
  const newAccountName = NEW_SCHOOL_MAP.get(splitAccountName[0]);
  return newAccountName ? newAccountName : splitAccountName[0];
}

function parseCourseCode(courseCode) {
  if (!courseCode) {
    console.warn("Current course has no prop course_code");

    return {
      courseCode: "",
      semester: "",
      year: "",
      roundId: "",
    };
  }
  const found = courseCode.match(/(\w+) (HT|VT)(\d\d) \((\w+)\)/);

  if (!found) {
    console.warn(`Wrong course_code format: ${courseCode}`);

    return {
      courseCode: "",
      semester: "",
      year: "",
      roundId: "",
    };
  }

  return {
    courseCode: found[1],
    semester: found[2],
    year: found[3],
    roundId: found[4],
  };
}

function getSubAccountType(accountName) {
  if (accountName.includes("Manually")) {
    return "manual";
  } else if (accountName.includes("Imported")) {
    return "imported";
  } else if (accountName.includes("Sandboxes")) {
    return "sandbox";
  } else {
    return "";
  }
}

function isPublished(state) {
  switch (state) {
    case "unpublished":
      return "false";
    case "available":
      return "true";
    case "completed":
      return "true";
    case "deleted":
      return "false";
    default:
      return "";
  }
}

async function getStudentSummary(canvas, courseId) {
  try {
    const students = canvas.list(
      `courses/${courseId}/analytics/student_summaries`
    );
    let pageViews = 0;
    let numberOfStudents = 0;
    let totalParticipations = 0;
    for await (student of students) {
      numberOfStudents++;
      totalParticipations += student.participations;
      pageViews += student.page_views;
    }

    return {
      pageViews,
      averageParticipation: numberOfStudents
        ? totalParticipations / numberOfStudents
        : 0,
    };
  } catch (e) {
    // Note: Enable some extra logging for debugging!
    /*console.warn(
      `Something went wrong when fetching student summaries for course ${courseId}`
    )
    console.warn(e)*/
    return false;
  }
}


async function getAssignmentData(canvas, courseId) {
  const publishedAssignments = (
    await canvas.list(`courses/${courseId}/assignments`).toArray()
  ).filter((assignment) => assignment.published);
  console.debug("...getAssignmentData");

  const publishedQuizAssignments = publishedAssignments.filter(
    (assignment) => assignment.is_quiz_assignment
  );

  const publishedLTIAssignments = publishedAssignments.filter(
    (assignment) => assignment.is_quiz_lti_assignment
  );

  const assignmentIds = publishedAssignments.map((assignment) => assignment.id);
  console.debug(assignmentIds);
  let submissionsCount = 0;

  // INVESTIGATE: This call to Canvas is VERY slow.
  // - https://canvas.instructure.com/doc/api/submissions.html
  // - consider making parallell calls for all assignment_ids or workflow_state
  const res = await Promise.all(
    assignmentIds.map(async (id) => {
      try {
        const r = await canvas.list(
          `courses/${courseId}/students/submissions`,
          {
            "student_ids[]": "all",
            assignment_ids: [id],
            workflow_state: ["graded", "submitted", "pending_review"],
          }
        );
        return (await r.toArray()).length;
      } catch (e) {
        // Accept forbidden errors silently
        if (e.statusCode !== 403 /* Forbidden */) {
          console.warn(
            "An error occured when trying to get submissions. Using 0 submissions for this course room."
          );
        }
        return 0;
      }
    })
  );
  submissionsCount = res.reduce(
    (curr, next) => curr + next,
    0
  );
  // submissionsCount = (
  //   await canvas
  //     .list(`courses/${courseId}/students/submissions`, {
  //       'student_ids[]': 'all',
  //       assignment_ids: assignmentIds,
  //       workflow_state: ['graded', 'submitted', 'pending_review']
  //     })
  //     .toArray()
  // ).length

  console.debug("=> getAssignmentData");
  return {
    assignments: publishedAssignments.length,
    quizAssignments: publishedQuizAssignments.length,
    ltiAssignments: publishedLTIAssignments.length,
    assignmentSubmissions: submissionsCount,
  };
}

async function getQuizData(canvas, courseId) {
  const quizzesResponse = canvas.list(`courses/${courseId}/quizzes`);

  let quizzes = 0;
  let quizSubmissions = 0;
  for await (quiz of quizzesResponse) {
    if (quiz.published) {
      quizzes++;
      const submissionsResponse = await canvas.get(
        `courses/${courseId}/quizzes/${quiz.id}/submissions`
      );
      for (submission of submissionsResponse.body.quiz_submissions) {
        if (
          submission.workflow_state === "pending_review" ||
          submission.workflow_state === "complete"
        ) {
          quizSubmissions++;
        }
      }
    }
  }

  console.debug("=> getQuizData");
  return { quizzes, quizSubmissions };
}


// TODO: Using ; instead of , for now - should I?
async function start() {
  // Fetch id:s for all Canvas courses which have been exported
  // const transferredCourses = await transferToLadokData.fetchTransferredCourses()

  // Start out creating folders, cleaning files et.c.
  if (!fs.existsSync(FOLDER_NAME)) {
    fs.mkdirSync("output");
  }
  const outputPath = path.resolve("./output", "stats-courserooms.csv");
  if (fs.existsSync(outputPath) && !process.env.APPEND_FROM_ID) {
    fs.unlinkSync(outputPath);
  }

  let hasWrittenHeaders = false;
  if (process.env.APPEND_FROM_ID) {
    // Don't write headers if appending
    hasWrittenHeaders = true;
  }

  const canvas = CanvasApi(
    process.env.CANVAS_API_URL,
    process.env.CANVAS_ACCESS_TOKEN
  );
  const courses = canvas.list("accounts/1/courses", {
    include: [
      "account",
      "total_students",
      "teachers",
      "concluded",
      "syllabus_body",
    ],
    per_page: parseInt(process.env.PER_PAGE),
    page: parseInt(process.env.PAGE),
  });

  let n = 0;
  for await (const course of courses) {
    n++;
    console.log(
      `${n.toString().padStart(7, " ")}: ${course.sis_course_id} | ${
        course.course_code
      }`
    );

    if (
      course.sis_course_id &&
      process.env.MATCH_SIS_ID &&
      !course.sis_course_id.match(process.env.MATCH_SIS_ID)
    ) {
      console.debug(
        `sis id doesnt match ${process.env.MATCH_SIS_ID} (${course.sis_course_id}, ${course.id}), skipping`
      );
      continue;
    }

    if (!course.sis_course_id) {
      console.log(
        "Skipping course without sis_course_id",
        course.name,
        course.id
      );
      continue;
    }

    const courseId = course.id;
    if (courseId < process.env.APPEND_FROM_ID) {
      console.debug(`Skipping ${course.name} due to append mode.`);
      continue;
    }
    console.debug(`Processing /courses/${courseId}: ${course.name}`);

    const { courseCode, semester, year, roundId } = parseCourseCode(
      course.course_code
    );

    // Allow processing only a specific year
    if (MATCH_YEAR !== undefined && year !== MATCH_YEAR) {
      continue;
    }

    // Step 1: gather course data
    const courseAccountName = course.account.name;
    const subAccount = getSubAccountType(courseAccountName);

    const [resAssignmentData, resQuizData, resStudentSummary] = await Promise.all([
      getAssignmentData(canvas, courseId),
      getQuizData(canvas, courseId),
      getStudentSummary(canvas, courseId),
    ]);

    const { pageViews, averageParticipation } = resStudentSummary;

    const {
      assignments,
      quizAssignments,
      ltiAssignments,
      assignmentSubmissions,
    } = resAssignmentData;
    const { quizzes, quizSubmissions } = resQuizData;

    let outp = {
      courseId,
      sisCourseId: course.sis_course_id,
      courseName: `"${course.name}"`,
      courseCode,
      year,
      period: semester + year,
      isPublished: isPublished(course.workflow_state),
      subAccount,
      assignments, // Note: "New Quizzes" are treated as assignments due to being an LTI app
      quizAssignments, // Note: "Old Quizzes" are included in assignments if they are of type "graded"
      ltiAssignments,
      assignmentSubmissions,
      quizzes,
      quizSubmissions,
      averageParticipation,
      pageViews,
      // contentful
    }

    // Step 4: output
    if (!hasWrittenHeaders) {
      fs.appendFileSync(outputPath, `${Object.keys(outp).join(";")}\n`);
      hasWrittenHeaders = true;
    }

    fs.appendFileSync(outputPath, `${Object.values(outp).join(";")}\n`);
  }

  console.log("Done.");
}

start();
