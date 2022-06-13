## Examples

```sh
# 1. Download provisioning report from Canvas, content:courses and sections, include deleted, from Canvas

# 2. Create the CSV-file for ID change in Canvas
$ ./cli create-csv-for-id-change --reportFile sis_export_csv_03_Jun_2022_418/courses.csv

# 3. Create CSV files for name change in Canvas
# Note: id has to be changed before this is imported into Canvas. Either both in the same sis import, or first id change and then name change
$ ./cli create-csv-for-name-change --reportFile sis_export_csv_03_Jun_2022_418/courses.csv
# Verify that the content of the file outp/courseChangeName.csv looks correct.

# 4. ZIP and upload the following files to Canvas as SIS Import:
# outp/courseChangeName.csv, outp/courseChangeSisId.csv, outp/sectionChangeName.csv, outp/sectionChangeSisId.csv

# OPTIONAL:
# 1. Audit CSV-file using report file
# This creates a csv file containing all course rooms with an existing sis_course_id in Canvas but missing in Kopps
$ ./cli audit-courses --reportFile sis_export_csv_03_Jun_2022_418/courses.csv --csvFile outp/audit.csv
```
