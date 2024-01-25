require("dotenv").config();
const Canvas = require("@kth/canvas-api").default;
import * as csv from "fast-csv";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// @ts-ignore
import type { course, submission, assignment } from "./types.ts";
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
    // 115,
    104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116,
  ];

  // const examroomAccounts = [110];
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
        const submissions: submission[] = await canvas
          .listItems(
            `courses/${course.id}/assignments/${examAssignment.id}/submissions`
          )
          .toArray();

        const result = {
          account_id: course.account_id,
          course_id: course.id,
          account_name: account.name.replaceAll(" - Examinations", ""),
          course_name: course.name,
          number_of_imported_exams: submissions.filter(
            (sub) => sub.workflow_state !== "unsubmitted"
          ).length,
          has_imported_exams: examAssignment.has_submitted_submissions ? 1 : 0,
          has_graded_imported_exams: examAssignment.graded_submissions_exist
            ? 1
            : 0,
          created_at: examAssignment.created_at.substring(0, 7), // only month is of interest
          anonymize_students: examAssignment.anonymize_students ? 1 : 0,
          course_state: course.workflow_state,
          assignment_published: examAssignment.published ? 1 : 0,
        };
        // Await the write, otherwise the next iteration might change the length of submissions before it is written
        await new Promise<void>((resolve, reject) => {
          resultCsv.write(result, (err) => {
            if (err) reject(err);
            resolve();
          });
        });
      } else {
        process.stdout.write(".");
      }
    }
  }
  resultCsv.end();
}

start();
