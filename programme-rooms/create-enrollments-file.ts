import * as csv from "fast-csv";
import fs from "fs";
import { TUGRestClientResponse, UGRestClient, UGRestClientError } from "kpm-ug-rest-client/src/ugRestClient.js";
import {
  TLadokStudent,
  getProgrammeInstanceIds,
  getProgrammeRooms,
  getStudents,
  printProgress,
} from "./utils.js";

const OAUTH_SERVER_BASE_URI =
  process.env.OAUTH_SERVER_BASE_URI || "https://login.ref.ug.kth.se/adfs";
const CLIENT_ID = process.env.CLIENT_ID!; // Required in .env.in
const CLIENT_SECRET = process.env.CLIENT_SECRET!; // Required in .env.in
const UG_REST_BASE_URI =
  process.env.UG_REST_BASE_URI || "https://integral-api.sys.kth.se/test/ug";

// Get all program codes
const progRooms = await getProgrammeRooms();
const codes = progRooms.map((progRoom) => progRoom.code);

const fileEnrollments = fs.createWriteStream("enrollments.csv");
const streamEnrollments = csv.format({ headers: true });
streamEnrollments.pipe(fileEnrollments);

const fileErrors = fs.createWriteStream("errors.csv");
const streamErrors = csv.format({ headers: true });
streamErrors.pipe(fileErrors);

console.log("Fetch students for all programs...");
const startTimeGetStudents = Date.now();
let allStudents: TLadokStudent[] = [];
let currCodeNr = 0;
for (const code of codes) {
  printProgress(++currCodeNr, codes.length, startTimeGetStudents);
  
  // Get all instances of a program
  const instances = await getProgrammeInstanceIds(code);

  if (instances.length === 0) {
    streamErrors.write({ code, error: "No instances" });
    continue;
  }

  const students = await getStudents(instances);
  allStudents.push(...students);

  for (const student of students) {
    streamEnrollments.write({
      section_id: `PROG.${code}`,
      user_integration_id: student.Uid,
      role_id: 3,
      status: "active",
    });
  }
}
console.log(" DONE!");

streamEnrollments.end();
streamErrors.end();

/**
 * The code below is used for troubleshooting
 */
console.log("Check which students are missing in UG...");

// Expected values from UG
export type TUgUser = {
  affiliations: string[];
  givenName: string;
  kthid: string;
  memberOf: string;
  primaryAffiliation: string;
  surname: string;
  username: string;
};

const ugClient = new UGRestClient({
  authServerDiscoveryURI: OAUTH_SERVER_BASE_URI,
  resourceBaseURI: UG_REST_BASE_URI,
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
});

const fileMissingStudents = fs.createWriteStream("missing-students.csv");
const streamMissingStudents = csv.format({ headers: true });
streamMissingStudents.pipe(fileMissingStudents);

console.log("Checking for missing students... total: ", allStudents.length);
const startTimeMissingStudents = Date.now();
let curr = 0;
for (const student of allStudents) {
  let res: TUGRestClientResponse<TUgUser> | void = undefined;
  try {
    res = await ugClient.get<TUgUser>(`users/${student}`).catch(ugClientGetErrorHandler);
  } catch (e: any) {
    // Log missing students
    const { Personnummer, Uid } = student;
    streamMissingStudents.write({ Personnummer, Uid, statusCode: e.details?.statusCode, status: e.details?.statusCode === 404 ? "not found" : "other error" });
  }
  printProgress(++curr, allStudents.length, startTimeMissingStudents);
}

streamMissingStudents.end();
console.log("Done!");

function ugClientGetErrorHandler(err: any) {
  if (err instanceof UGRestClientError) {
    throw err;
  }

  Error.captureStackTrace(err, ugClientGetErrorHandler);
  throw err;
}

