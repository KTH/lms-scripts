import got from "got";

// QUESTION: What determines language of program?
// INVESTIGATE: Can we get LADOK OID for program?

type ProgramRoom = {
  programmeCode: string;
  title: string;
  credits: number;
  creditUnitAbbr: string;
}

// 1. Call KOPPS API to get all program rooms
/*

  {
    programmeCode: 'CMAST',
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
async function getProgrammeRooms(): Promise<ProgramRoom[]> {
  const url = "https://api.kth.se/api/kopps/v2/programmes/all";
  return got(url).json();
}

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
console.log("course_id,short_name,long_name,status,account_id");
for (const progRoom of progRooms) {
  const {
    programmeCode,
    title,
    credits,
    creditUnitAbbr,
  } = progRoom;
  console.log(
    `PROG.${programmeCode}, ${programmeCode}, "${programmeCode} ${title}, ${credits} ${creditUnitAbbr}", active, PROGRAMME_ROOMS`
  );
}

// sections.csv
// - section_id -- PROG.CFATE (same as course_id)
// - course_id -- PROG.CFATE (see courses.csv)
// - name -- CFATE
// - status -- active (active, deleted)
console.log("section_id,course_id,name,status");
for (const progRoom of progRooms) {
  const { programmeCode } = progRoom;
  console.log(
    `PROG.${programmeCode}, PROG.${programmeCode}, ${programmeCode}, active`
  );
}