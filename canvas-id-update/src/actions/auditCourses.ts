import { parse } from "fast-csv";
import fs from "node:fs";
import path from "node:path";

const OUTP_DIR = path.resolve(process.cwd(), "outp");
const INPUT_DIR = path.resolve(process.cwd(), "provisioning-old");
const COURSE_IDS = new Map();

async function populateCourseIds() {
  const courseProvisioningFile = path.join(INPUT_DIR, "courses.csv");

  return new Promise((resolve) => {
    fs.createReadStream(courseProvisioningFile)
      .pipe(parse({ headers: true }))
      .on("error", (error) => console.error(error))
      .on("data", (row) => {
        if (row.course_id !== "") {
          COURSE_IDS.set(row.course_id, false);
        }
      })
      .on("end", resolve);
  });
}

async function checkIds() {
  const changeCourseSisIdFile = path.join(OUTP_DIR, "courseChangeSisId.csv");

  return new Promise((resolve) => {
    fs.createReadStream(changeCourseSisIdFile)
      .pipe(parse({ headers: true }))
      .on("error", (error) => console.error(error))
      .on("data", (row) => {
        if (COURSE_IDS.has(row.old_id)) {
          COURSE_IDS.set(row.old_id, true);
        }
      })
      .on("end", resolve);
  });
}

async function run() {
  await populateCourseIds();
  await checkIds();

  for (const [id, willBeChanged] of COURSE_IDS) {
    if (!willBeChanged) {
      if (id.length < 15) {
        console.log(id);
      }
    }
  }
}

run();
