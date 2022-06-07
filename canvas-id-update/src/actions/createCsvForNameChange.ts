import path from "path";
import { getCourseRounds } from "./kopps";
import { createCsvSerializer, createFolder, createSisCourseId, TERMS_TO_IMPORT } from "./utils";

export default async function run({ outpDir }) {
    const outpDirPath = path.resolve(process.cwd(), outpDir);
    createFolder(outpDirPath);
    
    const courseCsv = createCsvSerializer(`${outpDirPath}/courseChangeName.csv`);
    const sectionCsv = createCsvSerializer(`${outpDirPath}/sectionChangeName.csv`);
    const skippedCsv = createCsvSerializer(`${outpDirPath}/skippedChangeName.csv`);
  
    for (const term of TERMS_TO_IMPORT) {
      const courseRounds = await getCourseRounds(term);
      for (const row of courseRounds) {
        if (!row.ladokUid) {
            const outpRow = {
              ...row,
              sis_id: createSisCourseId(row)
            }
            skippedCsv.write(outpRow);
            continue;
          }

      }
    }
  
    courseCsv.end();
    sectionCsv.end();
    skippedCsv.end();
  };