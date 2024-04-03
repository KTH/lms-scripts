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
  await createAktivitetstillfalle();
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
  console.log(body);
  addStudents(body.Uid);
}

async function addStudents(uid) {
  const studentId = "87a06f25-73e4-11ee-97b2-e77c94ff4c10";

  await ladokGot.post(
    `resultat/aktivitetstillfallesmojlighet/studieresultat/7ed0b2b8-74d0-11ee-bf24-29cb18164efb`,
    {
      body: {
        AktivitetstillfallesalternativUID:
          "f1d989ae-f1c9-11ee-835e-1693d1304552",
      },
      headers: {
        Accept:
          "application/vnd.ladok-resultat+json, application/json, text/plain, */*",
        "Content-Type": "application/vnd.ladok-resultat+json",
      },
    }
  );
}

start().catch((e) => {
  console.error(e);
});
