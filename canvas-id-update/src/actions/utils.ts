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
