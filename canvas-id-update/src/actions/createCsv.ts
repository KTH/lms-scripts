import * as csv from "fast-csv";
import fs from "node:fs";
import path from "node:path";
import { getCourseRounds } from "./kopps";

const log = console;
const OUTP_DIR = "outp";
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


function createCsvSerializer(name) {
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

(async function run() {
  const outpPath = path.resolve(process.cwd(), OUTP_DIR);
  const courseCsv = createCsvSerializer(`${outpPath}/courseChangeSisId.csv`);
  const sectionCsv = createCsvSerializer(`${outpPath}/sectionChangeSisId.csv`);

  for (const term of TERMS_TO_IMPORT) {
    const courseRounds = await getCourseRounds(term);
    for (const row of courseRounds) {

      // TODO: In early courses, the LADOK UID is missing in Kopps. How do we want to handle this?

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
})();


