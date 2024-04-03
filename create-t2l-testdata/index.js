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
  const { body: organisations } = await ladokGot(
    "kataloginformation/organisation",
    {
      headers: {
        Accept: "application/vnd.ladok-kataloginformation+json",
      },
    }
  );
  const { body: authenticatedUser } = await ladokGot(
    "kataloginformation/anvandare/autentiserad",
    {
      headers: {
        Accept: "application/vnd.ladok-kataloginformation+json",
      },
    }
  );
  console.log(
    `You are: ${chalk.bold(authenticatedUser.Anvandarnamn)} - UID: ${
      authenticatedUser.Uid
    }`
  );
}

start().catch((e) => {
  console.error(e);
});
