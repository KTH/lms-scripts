import yargs from "yargs";

var cli = yargs
  .usage('canvasIdUpdate <command>')
  .demand(1, 'must provide a valid command')
  .option('dry-run', {
    default: false,
    describe: `Perform a dry run`,
    type: 'boolean'
  })
  .command('snapshot', 'create a snapshopt', (yargs) => {
    yargs.option('table', {
      alias: 't',
      demand: true,
      describe: 'table to snapshot',
      type: 'string'
    })
    .help('help')
  })
  .command('revert', 'revert to given snapshot', (yargs) => {
    yargs.option('table', {
      alias: 't',
      demand: true,
      describe: 'table to snapshot',
      type: 'string'
    })
    .option('file', {
      alias: 'f',
      demand: true,
      describe: 'file containing snapshot',
      type: 'string'
    });
  })
  .command('update', 'perform id update based on given snapshot', (yargs) => {
    yargs.option('table', {
      alias: 't',
      demand: true,
      describe: 'table to update',
      type: 'string'
    })
    .option('file', {
      alias: 'f',
      demand: true,
      describe: 'file containing snapshot',
      type: 'string'
    });
  })
  .help('help')

module.exports = {
  cli: cli,
  run(argv) {
    var command = argv._[0]
    
    if (!command) {
      console.error('invalid command')
      cli.showHelp()
      process.exit(1)
    }
  }
}
