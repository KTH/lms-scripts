import * as csv from "fast-csv";
import fs from "fs";
import {
  getProgrammeRooms,
  getStudentsForProgramAsKthIds,
  getStudentUid,
  printProgress,
} from "./utils.js";

const IS_DEV = process.env.NODE_ENV !== "production";

// Get all program codes
const progRooms = await getProgrammeRooms();
const codes = progRooms.map((progRoom) => progRoom.programmeCode);

IS_DEV && console.log("Fetch students for all programs...");
const startTimeGetStudents = Date.now();
const studentsByProgram: { [key: string]: string[] } = {};
let totalNrofStudents = 0;
let currCodeNr = 0;
for (const code of codes) {
  IS_DEV && printProgress(++currCodeNr, codes.length, startTimeGetStudents);
  
  const students = await getStudentsForProgramAsKthIds(code);

  studentsByProgram[code] = students;
  totalNrofStudents += students.length;
}
IS_DEV && console.log(" DONE!");


IS_DEV && console.log("Fetch student uid and write to file...");
const fileEnrollments = fs.createWriteStream("enrollments.csv");
const streamEnrollments = csv.format({ headers: true });
streamEnrollments.pipe(fileEnrollments);

const fileErrors = fs.createWriteStream("errors.csv");
const streamErrors = csv.format({ headers: true });
streamErrors.pipe(fileErrors);

const startTimeGetStudentUid = Date.now();
let currStudentNr = 0;
for (const code of Object.keys(studentsByProgram)) {
  const students = studentsByProgram[code];
  for (const studentKthId of students) {
    IS_DEV && printProgress(++currStudentNr, totalNrofStudents, startTimeGetStudentUid);

    const studentUid = await getStudentUid(studentKthId);

    if (studentUid === undefined) {
      streamErrors.write({ code, studentKthId, studentUid, error: "studentUid not found" });
      continue;
    }

    streamEnrollments.write({
      section_id: `PROG.${code}`,
      user_integration_id: studentUid,
      role_id: 3,
      status: "active",
    });
  }
}

IS_DEV && console.log(" DONE!");

streamEnrollments.end();
streamErrors.end();
