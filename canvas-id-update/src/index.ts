import yargs from "yargs";
import { hideBin } from 'yargs/helpers';
import packageJson from '../package.json';
import createCsvForIdChange from "./actions/createCsvForIdChange";
import createCsvForNameChange from "./actions/createCsvForNameChange";
import auditCourses from "./actions/auditCourses";

const cli = yargs(hideBin(process.argv))
  .usage('cli <command> [options]')
  .demand(1, 'must provide a valid command')
  // .option('dry-run', {
  //   default: false,
  //   describe: `Perform a dry run`,
  //   type: 'boolean'
  // })
  .option('outDir', {
    demand: false,
    describe: 'directory for output',
    type: 'string',
    default: 'outp'
  })
  .command('create-csv-for-id-change', 'Create the sis-id change files', (yargs) => {
    yargs
    .version(false)
    .option('reportFile', {
      demand: true,
      describe: 'path to the course report file from Canvas',
      type: 'string'
    })
  })
  .command('create-csv-for-name-change', 'Create the sis-id change files', (yargs) => {
    yargs
    .version(false)
    .option('reportFile', {
      demand: true,
      describe: 'path to the course report file from Canvas',
      type: 'string'
    })
  })
  .command('audit-courses', 'Check generated courses file against report', (yargs) => {
    yargs
    .version(false)
    .option('reportFile', {
      demand: true,
      describe: 'path to the course report file from Canvas',
      type: 'string'
      })
      .option('csvFile', {
        demand: true,
        describe: 'path to the generated course csv file',
        type: 'string'
      })
  })
  .help('help')
  .version("CLI v." + packageJson.version);

(async function () {
  const argv = cli.parse(process.argv.slice(2));
  const command = argv._[0];

  const {
    outDir,
    reportFile
  } = argv;
  switch (command) {
    case "create-csv-for-id-change":
      await createCsvForIdChange({
        outpDir: outDir,
        reportFile
    });
      break;
    case "create-csv-for-name-change":
        await createCsvForNameChange({
          outpDir: outDir,
          reportFile
        });
        break;
      case "audit-courses":
      const {
        csvFile
      } = argv;
      await auditCourses({
        outpDir: outDir,
        reportFile,
        csvFile
      });
      break;
    default:
      console.log("Try 'cli help' for instructions.");
  }

})();
