# Collect course data

This script collects a ton of data from the Canvas LMS and saves it to a csv file using semicolon as separator. Beware, this script runs its requests serially and likely takes several days to finish,

## The environment variables

To make the script run properly, one needs to create a file called `.env` and set the following variables (see file `.env.in` for a complete listing as well).

- **CANVAS_API_URL**\
  This variable points to the relevant Canvas API to use.
- **CANVAS_ACCESS_TOKEN**\
  This variable contains an access token for the Canvas API.
- **KOPPS_API_V1_URL**\
  This variable points to the Kopps API v1.
- **MONGODB_CONNECTION_STRING**\
  This variable contains a connection string to a MongoDB database containing stats about certain LTI usage.
- **MONGODB_DATABASE_NAME**\
  This variable contains the name of the database where LTI usage stats resides.
- **OUTPUT_DATA_FILE**\
  This variable contanins the name of the file where one wants to save the output data.

## The data

The output of this script contains the following data.

- _canvas_id_\
  The ID for the course in Canvas.
- _sis_id_\
  The SIS ID for the course in Canvas.
- _name_\
  The name of the course in Canvas.
- _course_code_\
  The course code extracted from the _SIS ID_ of the course in Canvas.
- _course_url_\
  The url to the course in Canvas Test.
- _school_\
  The name of the associated school based on which subaccount contains the course in Canvas.
- _education_cycle_\
  The educational level code of the course from Kopps.
- _sub-account_\
  The type of subaccount which contains the course in Canvas. Can be `manual`, `imported`, `sandbox` or an empty string.
- _sections_\
  The total number of sections in the course.
- _cross-listed_sections_\
  The total number of cross-listed sections in the course. A subset of _sections_.
- _section_sis_ids_\
  A list of the _SIS ID_ for each section in the course. Sections missing a _SIS ID_ will be excluded.
- _number_of_teachers_\
  The number of teachers associated with the course in Canvas. Includes the roles `Teacher`, `Course Responsible`, `Examiner`, `Ext. teacher`, `Course admin`.
- _number_of_students_\
  The number of students associated with the course in Canvas. Includes the roles `Student`, `Re-reg student`, `Ext. student`, `PhD student`, `Manually added student`, `Admitted not registered student`.
- _is_published_\
  If course is `available` or `completed` this is `true`; if `unpublished` or `deleted` this is `false`.
- _is_viewed_\
  If the course has at least one student page view according to the analytics endpoint, this is `true`.
- _semester_\
  Either `HTXX` or `VTXX` where `XX` is a year. The value is extracted from the _SIS ID_ of the course; if it is malformed, no value is set.
- _start_date_\
  The start date of the Canvas course. If missing; an empty string.
- _periods_\
  The periods over which the course runs (separated by commas). Data fetched from Kopps.
- _year_\
  The start year of the Canvas course, extracted from the _SIS ID_ of the course. If missing; an empty string.
- _license_\
  The license of the course in Canvas. Simplified to three different values; `Private`, `Public Domain` or `Creative Commons` (or an empty string if missing).
- _visibility_\
  Who can view the course. Can be either `Public`, `Institution` or `Course`.
- _kopps_language_\
  The language of the course fetch from a "randomly" selected course round of the course in Kopps. The logic might need to be improved to pick the correct course round.
- _canvas_language_\
  The locale of the course in Canvas. If no value has been set it is listed as `default`.
- _is_transferred_to_ladok_\
  Set to `true` if there is at least one record in the _Transfer to Ladok LTI app_ log database of grades being sent from the course.
- _groups_\
  The total number of groups with at least one member, in the course.
- _assignments_\
  The total number of published assignments in the course.
- _quiz_assignments_\
  The number of published assignments in the course that are of type quiz. Subset of _assignments_.
- _lti_assignments_\
  The number of published assignments that are associated with an LTI, e.g. Quizzes.Next. Subset of _assignments_.
- _assignment_submissions_\
  The total number of submissions in the course that are in one of the states `graded`, `submitted` or `pending_review`.
- _discussions_\
  The total number of discussion topics in the course.
- _posts_\
  The total number of `entries` and `replies` to discussions in the course.
- _pages_\
  The total number of published pages in the course.
- _files_\
  The total number of files uploaded to a course.
- _is_outcomes_\
  Either `true` or `false*` depending on if the course has at least one outcome. Defined by the existence of a `outcome_group_link`.
- _quizzes_\
  The total number of published quizzes in the course.
- _quiz_submissions_\
  The total number of quiz submissions in the course that are either in state `pending_review` or `complete`.
- _modules_\
  The total number of published modules in the course.
- _module_items_\
  The total number of published items in published modules in the course.
- _conferences_\
  The total number of conferences in the course.
- _is_syllabus_\
  Set to `true` if the course syllabus has a body value; otherwise `false`.
- _ltis_\
  The total number of external tools associated with the course.
- _ltis_wo_redirect_\
  The number of external tools associated with the course; not including type `Redirect Tool`.
- _avg_participation_\
  Quotient of total number of participations in a course divided by the number of students. Based on data from the Canvas LMS API Analytics endpoints.
- _page_views_\
  Total student page views of the course according to the Canvas LMS API Analytics endpoints.
- _is_contentful_\
  Set to `true` if (number of assignments + number of quizzes + number of modules) > 3.

## Shortcomings

- No indicator of page view time for courses. The only possible lead found thus far is to create some measurement based on the _user page views_ data: https://canvas.instructure.com/doc/api/users.html#method.page_views.index
