import got from "got";
import * as csv from "fast-csv";
import fs from "fs";
import { getProgrammeInstanceIds, getProgrammeRooms } from "./utils.js";

// Get all program codes
const progRooms = await getProgrammeRooms();
const codes = progRooms.map((progRoom) => progRoom.programmeCode);

const instances: {
  code: string;
  id: string;
}[] = [];

for (const code of codes) {
  console.log(code);
  // Get all instances of a program
  (await getProgrammeInstanceIds(code)).forEach((id) =>
    instances.push({ code, id })
  );
}

// For each instance, get all students

// GET https://www.integrationstest.ladok.se/gui/proxy/studiedeltagande/internal/deltagare/kurspaketeringstillfalle?page=1&limit=100&orderby=BENAMNING_ASC&utbildningskod=CDATE
