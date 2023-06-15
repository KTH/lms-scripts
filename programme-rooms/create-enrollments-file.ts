
import {
  createWriteStreamForCsv,
  getProgrammeRooms,
  getStudentsForProgramAsKthIds,
  getStudentUid,
  printProgress,
} from "./utils.js";

const IS_DEV = process.env.NODE_ENV !== "production";

const now = new Date();
const currentTermCutOffDate = new Date(now.getFullYear(), 7, 15); // 15th of August
const currentYearTerm = (now.getFullYear()).toString() + (now < currentTermCutOffDate ? "1" : "2");

// Get all program codes
const progRooms = await getProgrammeRooms();
const codes = progRooms.map((progRoom) => progRoom.code);

IS_DEV && console.log(`Fetch students for all programs... ${currentYearTerm}`);
const streamEnrollments = createWriteStreamForCsv("enrollments.csv");
// const streamErrors = createWriteStreamForCsv("errors.csv");

const startTimeGetStudents = Date.now();
let currCodeNr = 0;

for (const code of codes) {
  IS_DEV && printProgress(++currCodeNr, codes.length, startTimeGetStudents);
  
  const students = await getStudentsForProgramAsKthIds(code, currentYearTerm);

  for (const studentKthId of students) {
    streamEnrollments.write({
      section_id: `PROG.${code}`,
      sis_user_id: studentKthId,
      role_id: 3,
      status: "active",
    });
  }

}
IS_DEV && console.log(" DONE!");

streamEnrollments.end();
// streamErrors.end();
