import * as csv from "fast-csv";
import fs from "node:fs";
import path from "node:path";
import { getCourseRounds } from "./kopps";

const TERMS_TO_IMPORT = [
  "20161",
  "20162",
  "20171",
  "20172",
  "20181",
  "20182",
  "20191",
  "20192",
  "20201",
  "20202",
  "20211",
  "20212",
  "20221",
  "20222",
  "20231",
  "20232"
];

function createFolder(folderPath: string) {
  try {
    fs.statSync(folderPath);
  } catch (err) {
    // Folder doesn't exist, create
    fs.mkdirSync(folderPath, { recursive: true });
  }
}

function createCsvSerializer(name: string) {
  const writer = fs.createWriteStream(name);
  const serializer = csv.format({ headers: true });
  serializer.pipe(writer);
  return serializer;
}

const termLookup = { VT: 1, HT: 2, 1: "VT", 2: "HT" };

function createSisCourseId({ courseCode, startTerm, roundId }) {
  const termNum = startTerm[4];
  const shortYear = `${startTerm[2]}${startTerm[3]}`;
  const term = termLookup[termNum];

  return `${courseCode}${term}${shortYear}${roundId}`;
}

export default async function run({ outpDir }) {
  const outpDirPath = path.resolve(process.cwd(), outpDir);
  createFolder(outpDirPath);
  
  const courseCsv = createCsvSerializer(`${outpDirPath}/courseChangeSisId.csv`);
  const sectionCsv = createCsvSerializer(`${outpDirPath}/sectionChangeSisId.csv`);
  const skippedCsv = createCsvSerializer(`${outpDirPath}/skippedChangeSisId.csv`);

  for (const term of TERMS_TO_IMPORT) {
    const courseRounds = await getCourseRounds(term);
    for (const row of courseRounds) {

      // TODO: In early courses, the LADOK UID is missing in Kopps. How do we want to handle this?
      if (!row.ladokUid) {
        const outpRow = {
          ...row,
          sis_id: createSisCourseId(row)
        }
        skippedCsv.write(outpRow);
        continue;
      }

      const newRow = {
        old_id: createSisCourseId(row),
        new_id: row.ladokUid,
        new_integration_id: "<delete>" // We want to remove the integration id from the object
      }

      courseCsv.write({
        ...newRow,
        type: "course"
      });
      
      sectionCsv.write({
        ...newRow,
        type: "section"
      });
    }
  }

  courseCsv.end();
  sectionCsv.end();
  skippedCsv.end();
};


