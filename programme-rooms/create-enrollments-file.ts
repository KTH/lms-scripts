import got from "got";
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

for (const code of codes) {
  console.log(code);
  // Get all instances of a program
  const instances = await getProgrammeInstanceIds(code);
  const students = await getStudents(instances);

  // ...
}

// For each instance, get all students

// GET https://www.integrationstest.ladok.se/gui/proxy/studiedeltagande/internal/deltagare/kurspaketeringstillfalle?page=1&limit=100&orderby=BENAMNING_ASC&utbildningskod=CDATE
