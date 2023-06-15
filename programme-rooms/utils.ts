import got from "got";
import dotenv from "dotenv";
dotenv.config();
import * as csv from "fast-csv";
import fs from "fs";
import assert from "assert/strict";
// @ts-ignore Missing types
import * as reqvars from "@kth/reqvars";
import { TUGRestClientResponse, UGRestClient, UGRestClientError } from "kpm-ug-rest-client/src/ugRestClient.js";
reqvars.check();

const OAUTH_SERVER_BASE_URI =
  process.env.OAUTH_SERVER_BASE_URI || "https://login.ref.ug.kth.se/adfs";
const CLIENT_ID = process.env.CLIENT_ID!; // Required in .env.in
const CLIENT_SECRET = process.env.CLIENT_SECRET!; // Required in .env.in
const UG_REST_BASE_URI =
  process.env.UG_REST_BASE_URI || "https://integral-api.sys.kth.se/test/ug";

export type ProgramRoom = {
  code: string;
  title: Record<'en'|'sv', string>
  credits: string;
  credit_unit_abbr: Record<'en'|'sv', string>
};

type LadokResponse<T> = {
  Resultat: T[];
  TotaltAntalPoster: number;
};

type LadokProgrammeInstanceResponse = LadokResponse<{
  Utbildningskod: string;
  UtbildningstillfalleUID: string;
}>;

export type TLadokStudent = {
  Efternamn: string,
  Fornamn: string,
  Personnummer: string,
  Uid: string,
  link: string[]
}

type LadokStudentResponse = LadokResponse<{
  Student: TLadokStudent;
}>;

export async function getProgrammeRooms(): Promise<ProgramRoom[]> {
  const url = "https://api.kth.se/api/kopps/v2/programme/";
  const body: any = await got(url).json()
  return body.programmes
}

const ugClient = new UGRestClient({
  authServerDiscoveryURI: OAUTH_SERVER_BASE_URI,
  resourceBaseURI: UG_REST_BASE_URI,
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
});

/** Get all students given a "UtbildningstillfalleUID" */
export async function getStudentsForProgramAsKthIds(
  programCode: string, yearTerm: string
): Promise<string[]> {
  assert(typeof programCode === "string", "programCode must be a string");
  assert(typeof yearTerm === "string" && yearTerm.match(/^\d{4}[1|2]$/), "yearTerm must be a string of format YYYY1 or YYYY2");

  let res: TUGRestClientResponse<{members: string[]}[]> | void = undefined;
  try {
    res = await ugClient.get<{members: string[]}[]>(`groups?$filter=name eq 'ladok2.program.${programCode}.registrerade_${yearTerm}'&expand=members`).catch(ugClientGetErrorHandler);
  } catch (e: any) {
  }

  return res?.json?.[0]?.members || [];
}

export async function getStudentUid(
  kthId: string
): Promise<string | undefined> {
  let res: TUGRestClientResponse<{ladok3StudentUid: string}> | void = undefined;
  try {
    res = await ugClient.get<{ladok3StudentUid: string}>(`users/${kthId}`).catch(ugClientGetErrorHandler);
  } catch (e: any) {
  }

  return res?.json?.ladok3StudentUid;
}

function ugClientGetErrorHandler(err: any) {
  if (err instanceof UGRestClientError) {
    throw err;
  }

  Error.captureStackTrace(err, ugClientGetErrorHandler);
  throw err;
}


export function printProgress(curr: number, total: number, startTime: number) {
  const elapsed = Date.now() - startTime;
  const remaining = elapsed / curr * (total - curr);
  const finishedAt = new Date(Date.now() + remaining).toLocaleTimeString();
  process.stdout.write(`\rProcessing: ${curr}/${total} (finished at: ${finishedAt})`);
}

export function createWriteStreamForCsv(fileName: string) {
  const file = fs.createWriteStream(fileName);
  const stream = csv.format({ headers: true });
  stream.pipe(file);
  return stream;
}