# Läs loggfiler i Canvas

Skript i denna katalog sammanställer loggar från sis imports i Canvas, så att man kan se om våra synkningar fungerar som väntat.

Körs på följande sätt i ett terminalfönster:

```
npm install
npm start
```

Då kommer du bli presenterad med att antal alternativ i terminalfönstret. Följ dem.

## When you are developing this project together with `sis_import_utils`

This project has a dependency, `@kth/sis_import_utils` which is internally developed and is part of `lms-scripts`. If you are developing this project and `sis_import_utils` at the same time, you might want to see the changes without publishing the package all the time.

To do it:

1. `cd` to the `sis_import_utils` directory

   Run `npm link` there

2. `cd` to the `collect_sis_import_errors` directory (a.k.a. where this README file is)

   Run `npm link @kth/sis_import_utils`



Don't forget to install the dependencies in `sis_import_utils`!
