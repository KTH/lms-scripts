# Transfer scanned exams to Canvas

This project is divided in three scripts, each of them doing one task. Run each of them using `node «name of the script»`

1. Create one assignment in Canvas where the exams will be uploaded

    ```js
    node create-assignment.js
    ```

2. Download the exams in a local directory

    ```js
    node download-exams.js
    ```

3. Upload the exams from the local directory to a canvas assignment

    ```js
    node upload-exams.js
    ```
