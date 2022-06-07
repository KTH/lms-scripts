import path from "node:path";
import { getCourseRounds } from "./kopps";
import {
  createFolder,
  createCsvSerializer,
  TERMS_TO_IMPORT,
  createSisCourseId,
} from "./utils";

export default async function run({ outpDir }) {
  const outpDirPath = path.resolve(process.cwd(), outpDir);
  createFolder(outpDirPath);

  const courseCsv = createCsvSerializer(`${outpDirPath}/courseChangeSisId.csv`);
  const sectionCsv = createCsvSerializer(
    `${outpDirPath}/sectionChangeSisId.csv`
  );
  const skippedCsv = createCsvSerializer(
    `${outpDirPath}/skippedChangeSisId.csv`
  );
  const revertCourseCsv = createCsvSerializer(
    `${outpDirPath}/revertCourseChangeSisId.csv`
  );
  const revertSectionCsv = createCsvSerializer(
    `${outpDirPath}/revertSectionChangeSisId.csv`
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

      const newRow = {
        old_id: createSisCourseId(row),
        new_id: row.ladokUid,
        new_integration_id: "<delete>", // We want to remove the integration id from the object
      };

      courseCsv.write({
        ...newRow,
        type: "course",
      });

      sectionCsv.write({
        ...newRow,
        type: "section",
      });

      // Files to allow easy revert of ID change
      const revertRow = {
        old_id: row.ladokUid,
        new_id: createSisCourseId(row),
        new_integration_id: row.ladokUid,
      };

      revertCourseCsv.write({
        ...revertRow,
        type: "course",
      });

      revertSectionCsv.write({
        ...revertRow,
        type: "section",
      });
    }
  }

  courseCsv.end();
  sectionCsv.end();
  skippedCsv.end();
  revertCourseCsv.end();
  revertSectionCsv.end();
}
