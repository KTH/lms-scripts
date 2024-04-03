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
      Benamning: { sv: "Testtenta2", en: "Testtenta2" },
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
}

start().catch((e) => {
  console.error(e);
});
