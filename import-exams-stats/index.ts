require("dotenv").config();
const Canvas = require("@kth/canvas-api").default;
import * as csv from "fast-csv";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

type assignment = {
  id: number;
  due_at: string;
  unlock_at?: string;
  lock_at?: string;
  created_at: string;
  updated_at: string;
  anonymous_grading: boolean;
  graders_anonymous_to_graders: boolean;
  course_id: number;
  name: string;
  has_submitted_submissions: boolean;
  graded_submissions_exist: false;
  is_quiz_assignment: false;
  workflow_state: string;
  muted: boolean;
  integration_id?: null;
  integration_data?: any;
  published: boolean;
  unpublishable: boolean;
  post_manually: boolean;
  anonymize_students: boolean;
  require_lockdown_browser: boolean;
};

type course = {
  id: number;
  name: string;
  account_id: number;
  start_at: string;
  is_public: boolean;
  created_at: string;
  course_code: string;
  root_account_id: 1;
  end_at: null;
  sis_course_id: string;
  workflow_state: "available";
};

const canvas = new Canvas(
  process.env.CANVAS_API_URL,
  process.env.CANVAS_API_KEY
);

function createCsvSerializer(name) {
  const writer = fs.createWriteStream(name);
  const serializer = csv.format({ headers: true });
  serializer.pipe(writer);
  return serializer;
}

async function start() {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-"));
  const dir = path.join(baseDir, "csv");
  fs.mkdirSync(dir);
  console.log(`Creating csv files in ${dir}`);
  const resultCsv = createCsvSerializer(`${dir}/import-exams-stats.csv`);
  const examroomAccounts = [
    104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116,
  ];

  // const examroomAccounts = [110];
  // TODO: read from all of the exam accounts here
  for await (const accountId of examroomAccounts) {
    const { body: account } = await canvas.get(`accounts/${accountId}`);
    const courses: course[] = canvas.listItems(
      `accounts/${account.id}/courses`
    );

    for await (const course of courses) {
      const assignments: assignment[] = await canvas
        .listItems(`courses/${course.id}/assignments`)
        .toArray();
      const examAssignment = assignments.find(
        (a) => a.integration_data?.ladokId
      );

      if (examAssignment) {
        const result = {
          account_id: course.account_id,
          account_name: account.name,
          course_name: course.name,
          has_submitted_submissions: examAssignment.has_submitted_submissions
            ? 1
            : 0,
          graded_submissions_exist: examAssignment.graded_submissions_exist
            ? 1
            : 0,
          created_at: examAssignment.created_at.substring(0, 7), // only month is of interest
          anonymize_students: examAssignment.anonymize_students ? 1 : 0,
          course_state: course.workflow_state,
          assignment_published: examAssignment.published ? 1 : 0,
        };
        // console.log(result);
        resultCsv.write(result);
      } else {
        process.stdout.write(".");
      }
    }
  }
  resultCsv.end();
}

start();