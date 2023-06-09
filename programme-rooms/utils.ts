import got from "got";
import dotenv from "dotenv";
dotenv.config();
import assert from "assert/strict";
// @ts-ignore Missing types
import * as reqvars from "@kth/reqvars";
reqvars.check();

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

/** Get all students given a "UtbildningstillfalleUID" */
export async function getStudents(
  utbildningstillfalleUID: string[]
): Promise<TLadokStudent[]> {
  const url = `studiedeltagande/deltagare/kurspaketeringstillfalle`;

  const { body } = await gotClient.put<LadokStudentResponse>(url, {
    json: {
      utbildningstillfalleUID: utbildningstillfalleUID,
      deltagaretillstand: [
        // Vilka studentgrupper ska inkluderas i sektioner?
        "PAGAENDE",
        "EJ_PAGAENDE_TILLFALLESBYTE",
        "PAGAENDE_MED_SPARR",
        "UPPEHALL",
      ],
      page: 1,
      limit: 400,
      orderby: ["EFTERNAMN_ASC", "FORNAMN_ASC", "PERSONNUMMER_ASC"],
    },
  });

  // TODO: handle pagination

  // Check that we got all items
  // assert(
  //   body.Resultat.length === body.TotaltAntalPoster,
  //   "Not all items were returned"
  // );

  return body.Resultat.map((item) => item.Student);
}

export function printProgress(curr: number, total: number, startTime: number) {
  const elapsed = Date.now() - startTime;
  const remaining = elapsed / curr * (total - curr);
  const finishedAt = new Date(Date.now() + remaining).toLocaleTimeString();
  process.stdout.write(`\rProcessing: ${curr}/${total} (finished at: ${finishedAt})`);
}
