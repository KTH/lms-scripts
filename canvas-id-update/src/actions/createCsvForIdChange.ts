import path from "node:path";
import { getCourseRounds } from "./kopps";
import {
  createFolder,
  createCsvSerializer,
  TERMS_TO_IMPORT,
  createSisCourseId,
  createCourseLookup,
} from "./utils";

/*
 * Kopps returns all course rounds, regardless if they have a course room in Canvas or not. 
 * We only want to process currently existing course rooms. If these aren't skipped when we change the names we end up creating a lot of new course rooms.

 * Plus we want to minimize the number of expected false errors
 */
export function shouldSkip({ coursesInCanvas, row, alreadyWrittenCourseRooms }): string {

  if (!row.ladokUid) {
    return "MISSING_LADOKUID"
  }
  const sisId = createSisCourseId(row)
  if (!coursesInCanvas.has(sisId)) {
    return "MISSING_IN_CANVAS"
  }

  if (coursesInCanvas.get(sisId).status === 'deleted') {
    return "DELETED_IN_CANVAS"
  }

  if(alreadyWrittenCourseRooms[sisId]){
    return "DUPLICATE"
  }
  // Otherwise falsy 
}

export default async function run({ outpDir, reportFile }) {
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

  const coursesInCanvas = await createCourseLookup({ reportFile })
  const alreadyWrittenCourseRooms = {}

  for (const term of TERMS_TO_IMPORT) {
    const courseRounds = await getCourseRounds(term);
    for (const row of courseRounds) {
      const skipReason = shouldSkip({ coursesInCanvas, row, alreadyWrittenCourseRooms })
      const sisId = createSisCourseId(row)
      if (skipReason) {

        const outpRow = {
          ...row,
          sis_id: sisId,
          skipReason
        };
        skippedCsv.write(outpRow);
        continue;
      }
      const newRow = {
        old_id: sisId,
        new_id: row.ladokUid,
        new_integration_id: "<delete>", // We want to remove the integration id from the object
      };

      courseCsv.write({
        ...newRow,
        type: "course",
      });

      alreadyWrittenCourseRooms[sisId]=true

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
