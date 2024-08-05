import { createWriteStreamForCsv, getProgrammeRooms } from "./utils.js";

// 1. Call KOPPS API to get all program rooms
/*
  {
    "code": "ARKIT",
    "title": {"sv":"Arkitektutbildning","en":"Degree Programme in Architecture"},
    "credits": "300.0",
    "credit_unit_label": {"sv":"Högskolepoäng","en":"Credits"},
    "credit_unit_abbr": {"sv":"hp","en":"hp"},
    "cancelled": "false",
    "educational_level": "1",
    "department_name": "ABE/Arkitektur och samhällsbyggnad"
  }
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
const streamCourses = createWriteStreamForCsv("courses.csv");

// console.log("course_id,short_name,long_name,status,account_id");
for (const progRoom of progRooms) {
  const { code, title, credits, credit_unit_abbr } = progRoom;
  let inEnglish =
    title["en"].match(/^masterprogram/i) ||
    title["sv"].match(/^magisterprogram/i) ||
    code === "TCOMK";
  const displayTitle = inEnglish
    ? `Programme Room for ${title["en"]}`
    : `Programrum för ${title["sv"]}`;
  const displayCreditUnitAbbr = inEnglish
    ? credit_unit_abbr["en"]
    : credit_unit_abbr["sv"];
  streamCourses.write({
    course_id: `PROG.${code}`,
    short_name: code,
    long_name: `${code} ${displayTitle}, ${credits} ${displayCreditUnitAbbr}`,
    status: "active",
    account_id: "PROGRAMME_ROOMS",
  });
}
streamCourses.end();

// sections.csv
// - section_id -- PROG.CFATE (same as course_id)
// - course_id -- PROG.CFATE (see courses.csv)
// - name -- CFATE
// - status -- active (active, deleted)
const streamSections = createWriteStreamForCsv("sections.csv");

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
  //   `PROG.${programmeCode}, PROG.${programmeCode}, ${programmeCode}, active`
  // );
}
streamSections.end();

console.log("Done");
