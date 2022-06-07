import { KoppsRound } from "./kopps";
import * as csv from "fast-csv";
import fs from "node:fs";

export function createFolder(folderPath: string) {
  try {
    fs.statSync(folderPath);
  } catch (err) {
    // Folder doesn't exist, create
    fs.mkdirSync(folderPath, { recursive: true });
  }
}

export function createCsvSerializer(name: string) {
  const writer = fs.createWriteStream(name);
  const serializer = csv.format({ headers: true });
  serializer.pipe(writer);
  return serializer;
}

export const termLookup = { VT: 1, HT: 2, 1: "VT", 2: "HT" };

export const TERMS_TO_IMPORT = [
  "20161",
  "20162",
  "20171",
  "20172",
  "20181",
  "20182",
  "20191",
  "20192",
  "20201",
  "20202",
  "20211",
  "20212",
  "20221",
  "20222",
  "20231",
  "20232"
];

export function createSisCourseId({ courseCode, startTerm, roundId }) {
  const termNum = startTerm[4];
  const shortYear = `${startTerm[2]}${startTerm[3]}`;
  const term = termLookup[termNum];

  return `${courseCode}${term}${shortYear}${roundId}`;
}


const terms = { VT: 1, HT: 2, 1: "VT", 2: "HT" };

function createShortName({
  courseCode,
  startTerm,
  applicationCode,
}: KoppsRound) {
  const termNum = startTerm[4];
  const shortYear = `${startTerm[2]}${startTerm[3]}`;
  const term = terms[termNum];

  return `${courseCode} ${term}${shortYear} (${applicationCode})`;
}

function createLongName(round: KoppsRound) {
  const title = round.title[round.language === "Svenska" ? "sv" : "en"];

  return `${createShortName(round)} ${title}`;
}

function createAccountId(round: KoppsRound) {
  return `${round.schoolCode} - Imported course rounds`;
}

function createEndDate(round: KoppsRound, addNumberOfDays = 60) {
  // A round can span multiple semesters. Choose the last end date of all of the semesters to be used as end date for the course round
  const semestersDescending = round.offeredSemesters.sort(
    (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
  );

  const exactEndDate = semestersDescending[0].endDate;
  const roomEndDate = new Date(exactEndDate);
  roomEndDate.setDate(roomEndDate.getDate() + addNumberOfDays);

  // Use only date, no time, to make tests consistent in dev computers and build server
  const roomEndDateStr = roomEndDate.toISOString().split("T")[0];
  return roomEndDateStr;
}

function createStartDate(round: KoppsRound) {
  const { startDate } = round.offeredSemesters.find(
    (o) => o.semester === round.firstYearsemester
  );

  return `${startDate}T06:00:00Z`;
}

export {
  createShortName,
  createLongName,
  createAccountId,
  createStartDate,
  createEndDate,
};