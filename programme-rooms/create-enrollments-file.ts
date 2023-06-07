import * as csv from "fast-csv";
import fs from "fs";
import {
  getProgrammeInstanceIds,
  getProgrammeRooms,
  getStudents,
} from "./utils.js";

// Get all program codes
const progRooms = await getProgrammeRooms();
const codes = progRooms.map((progRoom) => progRoom.programmeCode);

const fileEnrollments = fs.createWriteStream("enrollments.csv");
const streamEnrollments = csv.format({ headers: true });
streamEnrollments.pipe(fileEnrollments);

for (const code of codes) {
  console.log(code);
  // Get all instances of a program
  const instances = await getProgrammeInstanceIds(code);
  const students = await getStudents(instances);

  for (const student of students) {
    streamEnrollments.write({
      section_id: `PROG.${code}`,
      user_integration_id: student,
    });
  }
}

streamEnrollments.end();
