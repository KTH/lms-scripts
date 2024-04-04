require("dotenv").config();
require("@kth/reqvars").check();
const got = require("got");
const inquirer = require("inquirer");
const chalk = require("chalk");
const fs = require("fs");
inquirer.registerPrompt(
  "autocomplete",
  require("inquirer-autocomplete-prompt")
);

const ladokGot = got.extend({
  baseUrl: process.env.LADOK_API_BASEURL,
  // pfx: fs.readFileSync('./certificate.pfx'),
  pfx: Buffer.from(process.env.LADOK_API_PFX_BASE64, "base64"),
  passphrase: process.env.LADOK_API_PFX_PASSPHRASE,
  json: true,
});

async function start() {
  // await createAktivitetstillfalle();
  await addStudents();
}

async function createAktivitetstillfalle() {
  const { body } = await ladokGot.post("resultat/aktivitetstillfalle", {
    body: {
      AktivitetstillfallestypID: "153882",
      Anmalan: false,
      Anmalningsperiod: { Startdatum: null, Slutdatum: null },
      Anonymt: false,
      Aktiviteter: [
        {
          // SF1624
          KursinstansUID: "7f20dbb5-73d8-11e8-b4e0-063f9afb40e3",
          UtbildningsinstansUID: "7f20dbb6-73d8-11e8-b4e0-063f9afb40e3",
        },
      ],
      KurstillfalleUIDer: ["d82f76e2-7d23-11ed-ba16-099432b5488e"],
      Ansvariga: [],
      Benamning: { sv: "Testtenta4", en: "Testtenta3" },
      Lopnummer: false,
      TillatAnmalanForStudentMedGodkantResultat: false,
      VisaInteAnonymkodForStudentenForeAktivitetsTillfalletArGenomfort: false,
    },
    headers: {
      Accept:
        "application/vnd.ladok-resultat+json, application/json, text/plain, */*",
      "Content-Type": "application/vnd.ladok-resultat+json",
    },
  });
  console.log(JSON.stringify(body, null, 2));
}

async function addStudents(uid) {
  const studentId = "87a06f25-73e4-11ee-97b2-e77c94ff4c10";

  await ladokGot.post(
    // Internal probably means that it isn't the same url, or params, when using the api
    // `resultat/aktivitetstillfallesmojlighet/studieresultat/7ed0b2b8-74d0-11ee-bf24-29cb18164efb`,
    `resultat/aktivitetstillfallesmojlighet/studieresultat/f489fcb4-2c55-11ee-998a-6a4f18c04b6e/skapaochanmal`,
    {
      _body: {
        AktivitetstillfalleUID: "f1d989ae-f1c9-11ee-835e-1693d1304552",
      },
      body: {
        AktivitetstillfalleUID: "11111111-2222-0000-0000-000000000000",
        AktivitetstillfallesalternativUID:
          "11111111-2222-0000-0000-000000000000",
        Anmalan: {
          Anmalningsmeddelande: "Hej, jag behöver extra luft på tentan!",
          Anmalningstidpunkt: "2012-01-01T14:00:00",
          LarosateID: 96,
          disabledLink: [
            {
              rel: "http://schemas.ladok.se",
              method: "GET",
              reasons: [
                {
                  sv: "Anledning",
                  en: "Reason",
                },
              ],
            },
          ],
          link: [
            {
              method: "POST",
              uri: "https://api.mit.ladok.se:443/test",
              mediaType: "application/vnd.ladok+xml",
              rel: "http://schemas.ladok.se",
            },
          ],
        },
        Anonymiseringskod: "",
        KurstillfalleStudentenArRegistreradPa:
          "11111111-2222-0000-0000-000000000000",
        LarosateID: 96,
        Rapporteringskontext: {
          KurstillfalleUID: "11111111-2222-0000-0000-000000000000",
          LarosateID: 96,
          UtbildningsinstansUID: "11111111-2222-0000-0000-000000000000",
          disabledLink: [
            {
              rel: "http://schemas.ladok.se",
              method: "GET",
              reasons: [
                {
                  sv: "Anledning",
                  en: "Reason",
                },
              ],
            },
          ],
          link: [
            {
              method: "POST",
              uri: "https://api.mit.ladok.se:443/test",
              mediaType: "application/vnd.ladok+xml",
              rel: "http://schemas.ladok.se",
            },
          ],
        },
        SenastAndradAv: "eva@ladok3.ladok.se",
        SenastSparad: "2012-01-11T12:45:45",
        Student: {
          Efternamn: "Svensson",
          Fornamn: "Sven",
          LarosateID: 96,
          Personnummer: "199611052383",
          SenastAndradAv: "eva@ladok3.ladok.se",
          SenastSparad: "2012-01-11T12:45:45",
          Uid: "11111111-2222-0000-0000-000000000000",
          disabledLink: [
            {
              rel: "http://schemas.ladok.se",
              method: "GET",
              reasons: [
                {
                  sv: "Anledning",
                  en: "Reason",
                },
              ],
            },
          ],
          link: [
            {
              method: "POST",
              uri: "https://api.mit.ladok.se:443/test",
              mediaType: "application/vnd.ladok+xml",
              rel: "http://schemas.ladok.se",
            },
          ],
        },
        StudentUID: "11111111-2222-0000-0000-000000000000",
        Uid: "11111111-2222-0000-0000-000000000000",
        disabledLink: [
          {
            rel: "http://schemas.ladok.se",
            method: "GET",
            reasons: [
              {
                sv: "Anledning",
                en: "Reason",
              },
            ],
          },
        ],
        link: [
          {
            method: "POST",
            uri: "https://api.mit.ladok.se:443/test",
            mediaType: "application/vnd.ladok+xml",
            rel: "http://schemas.ladok.se",
          },
        ],
      },
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );
}

start().catch((e) => {
  console.error(e);
});
