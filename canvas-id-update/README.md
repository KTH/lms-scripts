## Examples
```sh
# 1. Download provisioning report from Canvas, content:courses and sections, include deleted, from Canvas

# 2. Create the CSV-file
$ ./cli create-csv-for-id-change

# 3. Audit CSV-file using report file
# This creates a csv file containing all course rooms with an existing sis_course_id in Canvas but missing in Kopps
$ ./cli audit-courses --reportFile sis_export_csv_03_Jun_2022_418/courses.csv --csvFile outp/courseChangeSisId.csv
```