# Enroll Students to Examination Rooms

A script which compiles students registered for examinations to a csv file and sends it to the Canvas LMS.

## Environment Variables

- **CANVAS_API_URL**\
  The URL to the API of the desired Canvas instance.
- **CANVAS_API_TOKEN**\
  A token for accessing the aforementioned Canvas API.
- **AKTIVITETSTILLFALLEN_API_URL**\
  The URL to the API where to get examination data.
- **AKTIVITETSTILLFALLEN_API_TOKEN**\
  A token for accessing the aforementioned Aktivitetstillfallen API.
- **FROM_DATE**\
  The first date from which to collect students, e.g. `2020-04-17`.
- **TO_DATE**\
  The last date from which to collect students, e.g. `2020-04-17`.