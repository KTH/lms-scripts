## Examples
```sh
# 1. Download SIS-report (courses) from Canvas

# 2. Create the CSV-file
$ ./cli create-csv

# 3. Audit CSV-file using report file
$ ./cli audit-courses --reportFile sis_export_csv_03_Jun_2022_418/courses.csv --csvFile outp/courseChangeSisId.csv
```