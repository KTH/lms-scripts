import { parse } from "fast-csv";
import fs from "node:fs";
import path from "node:path";
import { createFolder, createCsvSerializer } from "./utils";

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
  const outpDirPath = path.resolve(process.cwd(), outpDir);
  createFolder(outpDirPath);

  const missingCsv = createCsvSerializer(`${outpDirPath}/coursesMissingInKopps.csv`);


  await populateCourseIds(reportFile);
  await checkIds(csvFile);

  for (const [id, willBeChanged] of COURSE_IDS) {
    if (!willBeChanged) {
      if (shouldBeExcluded(id)) continue;
      
      missingCsv.write({ id });
    }
  }
  missingCsv.end();
}

function shouldBeExcluded(id): boolean {
  // Skip tentarum
  if (id.startsWith("AKT.")) {
    return true;
  }

  // Skip RAPP-rum
  if (id.startsWith("RAPP_")) {
    return true;
  }

  // Skip old tentarum id format
  if (/^\w{6,7}_\w{4}_\d{4}-\d{2}-\d{2}$/.test(id)) {
    return true;
  }

  return false;
}
