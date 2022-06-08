import path from "path";
import { getCourseRounds } from "./kopps";
import {
  createAccountId,
  createCsvSerializer,
  createEndDate,
  createFolder,
  createLongName,
  createShortName,
  createSisCourseId,
  createStartDate,
  TERMS_TO_IMPORT,
} from "./utils";

export default async function run({ outpDir, reportFile }) {
  const outpDirPath = path.resolve(process.cwd(), outpDir);
  createFolder(outpDirPath);

  const courseCsv = createCsvSerializer(`${outpDirPath}/courseChangeName.csv`);
  const sectionCsv = createCsvSerializer(
    `${outpDirPath}/sectionChangeName.csv`
  );
  const skippedCsv = createCsvSerializer(
    `${outpDirPath}/skippedChangeName.csv`
  );

  for (const term of TERMS_TO_IMPORT) {
    const courseRounds = await getCourseRounds(term);
    for (const row of courseRounds) {
      if (!row.ladokUid) {
        const outpRow = {
          ...row,
          sis_id: createSisCourseId(row),
        };
        skippedCsv.write(outpRow);
        continue;
      }
      courseCsv.write({
        course_id: row.ladokUid,
        short_name: createShortName(row),
        long_name: createLongName(row),
        start_date: createStartDate(row),
        end_date: createEndDate(row),
        account_id: createAccountId(row),
        integration_id: undefined,
        status: "active",
      });

      sectionCsv.write({
        section_id: row.ladokUid,
        course_id: row.ladokUid,
        integration_id: undefined,
        name: createShortName(row),
        status: "active",
      });
    }
  }

  courseCsv.end();
  sectionCsv.end();
  skippedCsv.end();
}
