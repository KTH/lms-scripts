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
  const { Uid } = await createAktivitetstillfalle();
  await addStudents(Uid);
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
  // console.log(JSON.stringify(body, null, 2));
  return body;
}

async function addStudents(uid) {
  // const studentId = "87a06f25-73e4-11ee-97b2-e77c94ff4c10";

  const result = await ladokGot.get(
    // Internal probably means that it isn't the same url, or params, when using the api
    `resultat/aktivitetstillfallesmojlighet/aktivitetstillfallesmojlighet/filtrera/utananonymbehorighet?aktivitetstillfalleUID=${uid}`,
    // `resultat/aktivitetstillfallesmojlighet/studieresultat/${uid}/skapaochanmal`,
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );
  console.log(result);
}

start().catch((e) => {
  console.error(e);
});
