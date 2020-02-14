# CSV Parser DX

This application provides multiple modes of operation; they all, at least somewhat, relies on parsing csv files.

## Compare two csv-files based on sis id

**TBD**

## Purge invalid sis id:s

**TBD**

## Delete users

**TBD**

## Gather Möbius, Wiris and Kaltura statistics

The purpose of the _Möbius, Wiris and Kaltura_ mode is to extract data and present statistics about usage of the aforementioned LTI:s. The statistics are not periodized in any way. The implementation requires you to have local copies of data synced from the [Canvas Data API](https://community.canvaslms.com/docs/DOC-6600-how-to-use-the-canvas-data-cli-tool). If you want to learn more about the expected format of the data, you can read more [here](https://portal.inshosteddata.com/docs).

When running the mode, you will be prompted to supply the following information:

- Relative path to a synced copy of the [external_tool_activation_dim](https://portal.inshosteddata.com/docs#external_tool_activation_dim) file (_unzipped_).
- Relative path to folder where synced copies of [enrollment_dim](https://portal.inshosteddata.com/docs#enrollment_dim) files are located (_unzipped_).
- Relative path to a synced copy of the [external_tool_activation_fact](https://portal.inshosteddata.com/docs#external_tool_activation_fact) file (_unzipped_).
- Relative path to a synced copy of the [account_dim](https://portal.inshosteddata.com/docs#account_dim) file (_unzipped_).
- Relative path to a synced copy of the [course_dim](https://portal.inshosteddata.com/docs#course_dim) file (_unzipped_).
- Relative path to a csv file containing Kaltura statistics according to the format `CourseID;Video Count` where `CourseID` is the Canvas course ID and `Video Count` contains a count of how many videos as associated with the course. This data needs to be manually fetched from the Kaltura Management Console by inspecting _entries_ and looking at sub categories of the Canvas category (_Canvas_ -> _site_ -> _channels_). _Entries_ (i.e. videos) that are embedded in or in the Kaltura Media Gallery of a course in Canvas get that course's Canvas ID in a label.

## Gather LEQ statistics

The purpose of the _LEQ_ mode is to extract periodized data (for a set year) and present statistics about how _KTH Social LEQ_ implementation is used (integration with _Artologik Survey&Report_). The implementation requires two environmental variables to be set, to be able to interact with the [Survey&Report API](https://sunet.artologik.net/kth/Admin/services/api.svc/help):

- `LEQ_SNR_API_USERNAME` - _username for accessing the API_
- `LEQ_SNR_API_PASSWORD` - _password for the aforementioned username_

When running the mode, you will be prompted to supply the following information:

- Year to collect statistics for.
