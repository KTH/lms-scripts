# Canvas Tentalydelse Export
## General Explanation
From the provided list of Canvas Course ID’s the script does the following:

- For each course it looks for assignments that are published, and that are of upload type: `workflow_state === 'published'` and either `submission_types.includes('online_upload')` or have the `is_quiz_assignment` property set to `true`.
- For those it takes the assignment description and does the following:
	- Strips unnecessary html formatting (sanitise html) with exception of urls
	- Finds all urls, finds those that are pointing to Files in Canvas
	- Each attached file that is stored in Canvas is then downloaded (if available)
	- If file is not available, the exception is noted in a separate file (lockedFiles.txt)
	- An XML file is generated containing course details, and all the downloaded or generated files are added  as `Bilaga` elements.
	- All files including the XML file are saved in the folder named after the course

## Detailed explanation
List of courses is stored in the config object. This will be later adapted to take in either single course, list of courses, or an entire account.

Single API call `getCourse()` gets a list of all assignments, as well as create the export directory. File structure is not finalised (whether to compress end product or not) so I decided to keep the function as it is now. It will need to be re-written at some point to some degree.

Array of assignment objects it then passed to `getAssignments()`. There depending on the assignment type, there are two methods: one for upload assignments, and one for Classic Quizzes. Both produce a text file containing an assignment description, and a list of file IDs contained in that description.

Finding file urls, is based on regex formula. I assumed that any url that contains `/files/{some id}` is a Canvas url. `getUniqueFileUrls()` gets those IDs, removes duplicates and returns them in an array.

Canvas attachments cannot be downloaded directly, so for each file, a separate call using `processFiles()` needs to be made to obtain the full download url. For many (uncertain) reasons a file can be locked. Either unpublished or moved by the teacher on purpose or by accident. Locked files seem to be impossible to download via API, while viewable from the browser. That’s why file object `dFile` has a `lock` property, along with `lockExp` which provides lock explanation.

For files that are removed from Canvas (404) I decided to create a similar object called `failFile`.

Both `dlFile` and `failFile` are then pushed together into `fileArr` array, that get’s passed on to download function `downloadAttachmentsAndMakeXml()`. Due to asynchronous nature of the download, and few possible outcomes from the function, ‘pre-flight check’ function `ifFilesDoneMakeXML()` can be called from a few places.

If all files are accounted for, we can proceed to `makeXml()` which takes provided archive XML stencil, slices it up, and inserts course data, along with all the successfully downloaded attachments and assignment export files created in the export. Files that failed to download are gathered together in a `lockedFIles.txt` file, with Canvas File ID and reason for being listed there.
