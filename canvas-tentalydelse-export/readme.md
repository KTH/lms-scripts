# Canvas Tentalydelse Export
From the provided list of Canvas Course ID’s the script does the following:

- For each course it looks for assignments that are published, and that are of upload type: `workflow_state === 'published'` and `submission_types[0] === 'online_upload'`.
- For those it takes the assignment description and does the following:
	- Strips unnecessary html formatting (sanitise html) with exception of urls
	- Finds all urls, finds those that are pointing to Files in Canvas
	- Each File stored in Canvas is then downloaded (if available)
	- If file is not available, the exception is noted in a separate file (lockedFiles.txt)
	- An XML file is generated containing course details, and all the downloaded or generated files are added  as `Bilaga` elements.
	- All files including the XML file are saved in the folder named after the course
