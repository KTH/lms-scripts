import got from "got";
import dotenv from "dotenv";
dotenv.config();
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

const gotClient = got.extend({
  prefixUrl: process.env.LADOK_API_BASEURL,
  headers: {
    Accept: "application/vnd.ladok-studiedeltagande+json",
  },
  responseType: "json",
  https: {
    pfx: Buffer.from(process.env.LADOK_API_PFX_BASE64 as string, "base64"),
    passphrase: process.env.LADOK_API_PFX_PASSPHRASE,
  },
});

export type ProgramRoom = {
  programmeCode: string;
  title: string;
  titleOtherLanguage: string;
  credits: number;
  creditUnitAbbr: string;
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
  const url = "https://api.kth.se/api/kopps/v2/programmes/all";
  return got(url).json();
}

/** Get all "programtillfälleskod UID" from a given program code */
export async function getProgrammeInstanceIds(
  programmeCode: string
): Promise<string[]> {
  const url = `studiedeltagande/utbildningstillfalle/kurspaketeringstillfalle`;

  const { body } = await gotClient.get<LadokProgrammeInstanceResponse>(url, {
    searchParams: {
      utbildningskod: programmeCode,
      page: 1,
      limit: 400,

      // Ladok API requires this because order is not stable,
      // which is problematic with more than one page
      orderby: "BENAMNING_ASC",
    },
  });

  // Check that we got all items
  assert(
    body.Resultat.length === body.TotaltAntalPoster,
    "Not all items were returned"
  );

  // Check that all items have the same programmeCode
  assert(
    body.Resultat.every((item) => item.Utbildningskod === programmeCode),
    "Not all items have the same programmeCode"
  );

  return body.Resultat.map((item) => item.UtbildningstillfalleUID);
}

const ugClient = new UGRestClient({
  authServerDiscoveryURI: OAUTH_SERVER_BASE_URI,
  resourceBaseURI: UG_REST_BASE_URI,
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
});

/** Get all students given a "UtbildningstillfalleUID" */
export async function getStudentsForProgramAsKthIds(
  programCode: string
): Promise<string[]> {
  let res: TUGRestClientResponse<{members: string[]}[]> | void = undefined;
  try {
    res = await ugClient.get<{members: string[]}[]>(`groups?$filter=name eq 'ladok2.program.${programCode}.registrerade_20231'&expand=members`).catch(ugClientGetErrorHandler);
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
