import { parse } from "fast-csv";
import fs from "node:fs";
import path from "node:path";

const COURSE_IDS = new Map();

async function populateCourseIds(reportFile) {

  const courseProvisioningFile = path.resolve(process.cwd(), reportFile);

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

async function checkIds(csvFile) {
  const changeCourseSisIdFile = path.resolve(process.cwd(), csvFile);

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

export default async function run({ outpDir, reportFile, csvFile }) {
  await populateCourseIds(reportFile);
  await checkIds(csvFile);

  for (const [id, willBeChanged] of COURSE_IDS) {
    if (!willBeChanged) {
      if (id.length < 15) {
        console.log(id);
      }
    }
  }
}
