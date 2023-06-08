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

const fileErrors = fs.createWriteStream("errors.csv");
const streamErrors = csv.format({ headers: true });
streamErrors.pipe(fileErrors);

for (const code of codes) {
  console.log(code);
  // Get all instances of a program
  const instances = await getProgrammeInstanceIds(code);

  if (instances.length === 0) {
    streamErrors.write({ code, error: "No instances" });
    continue;
  }

  const students = await getStudents(instances);

  for (const student of students) {
    streamEnrollments.write({
      section_id: `PROG.${code}`,
      user_integration_id: student,
      role_id: 3,
      status: "active",
    });
  }
}

streamEnrollments.end();
streamErrors.end();
