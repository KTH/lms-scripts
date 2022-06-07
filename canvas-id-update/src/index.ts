import yargs from "yargs";
import { hideBin } from 'yargs/helpers';
import packageJson from '../package.json';
import createCvs from "./actions/createCsvForIdChange";
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
      .version(false);
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
  } = argv;
  switch (command) {
    case "create-csv-for-id-change":
      await createCvs({
        outpDir: outDir
      });
      break;
    case "audit-courses":
      const {
        reportFile,
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