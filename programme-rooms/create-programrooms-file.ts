import got from "got";
import * as csv from "fast-csv";
import fs from "fs";
import { getProgrammeRooms } from "./utils.js";

// QUESTION: What determines language of program?
// INVESTIGATE: Can we get LADOK OID for program?


// 1. Call KOPPS API to get all program rooms
/*

  {
    code: 'CMAST',
    title: 'Civilingenjörsutbildning i maskinteknik',
    titleOtherLanguage: 'Degree Programme in Mechanical Engineering',
    firstAdmissionTerm: '20072',
    credits: 300,
    creditUnitLabel: 'Högskolepoäng',
    creditUnitAbbr: 'hp',
    educationalLevel: 'BASIC',
    lengthInStudyYears: 5,
    owningSchoolCode: 'Industriell teknik och management',
    degrees: [ [Object] ]
  },

*/

// 2. Print out the ones that are in use
// - programCode
const progRooms = await getProgrammeRooms();

// Output
// https://canvas.instructure.com/doc/api/file.sis_csv.html

// courses.csv
// - course_id -- PROG.CFATE (In the user interface, this is called the SIS ID.)
// - short_name -- programCode
// - long_name -- "[CODE] Title ### hp"
// - status -- active (active, deleted, completed, published)
// - account_id -- "PROGRAMME_ROOMS" should be a new sub account, ask Martin
const fileCourses = fs.createWriteStream("courses.csv");
const streamCourses = csv.format({ headers: true });
streamCourses.pipe(fileCourses);

// console.log("course_id,short_name,long_name,status,account_id");
for (const progRoom of progRooms) {
  const {
    code,
    title,
    credits,
    creditUnitAbbr,
  } = progRoom;
  let inEnglish = title['en'].match(/^masterprogram/i)
    || title.match(/^magisterprogram/i)
    || code === "TCOMK";
  const displayTitle = inEnglish ? `Programme Room for ${titleOtherLanguage}` : `Programrum för ${title}`;
  streamCourses.write({
    course_id: `PROG.${code}`,
    short_name: code,
    long_name: `${code} ${displayTitle}, ${credits} ${creditUnitAbbr}`,
    status: "active",
    account_id: "PROGRAMME_ROOMS",
  });
  // console.log(
  //   `PROG.${code}, ${code}, "${code} ${title}, ${credits} ${creditUnitAbbr}", active, PROGRAMME_ROOMS`
  // );
}
streamCourses.end();

// sections.csv
// - section_id -- PROG.CFATE (same as course_id)
// - course_id -- PROG.CFATE (see courses.csv)
// - name -- CFATE
// - status -- active (active, deleted)
const fileSections = fs.createWriteStream("sections.csv");
const streamSections = csv.format({ headers: true });
streamSections.pipe(fileSections);

// console.log("section_id,course_id,name,status");
for (const progRoom of progRooms) {
  const { code } = progRoom;
  streamSections.write({
    section_id: `PROG.${code}`,
    course_id: `PROG.${code}`,
    name: code,
    status: "active",
  });
  // console.log(
  //   `PROG.${code}, PROG.${code}, ${code}, active`
  // );
}
streamSections.end();

console.log("Done");
