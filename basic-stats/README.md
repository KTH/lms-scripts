## This script is used to extract statistics from Canvas about the usage of KTH Import Exams.

1. create a `.env` file from the `.env.in` template and set the values in this file.
2. run the script index.ts: `npx ts-node index.ts`
3. Look in the terminal to see where the file is created. It will take a while to generate the file

### To create a graph from the file using LibreOffice

1. Open the generated file in LibreOffice. Create a `Pivot Table`: Insert -> Pivot Table

#### Settings

##### Column Fields:

- account_name

##### Row Fields:

- created_at

##### Data Fields:

- number_of_imported_exams

(To get another set of data in the graph, select for instance

- has_imported_exams
- has_graded_imported_exams
  )

Then create a column graph from the created Pivot table by clicking `Insert` -> `Chart`
