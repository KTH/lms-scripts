# Examination rooms enrollments

This script reads the data from the Aktivitetstillfällen API and creates CSV files to enroll people to examination rooms in Canvas.

For examinations (aktivitetstillfälle) with multiple course codes, the first one in alphabetical order will be considered the examination room in Canvas.

## Environment variables

- **AKTIVITETSTILLFALLEN_API_URL**\
  URL to the aktivitetstillfallen API.
- **AKTIVITETSTILLFALLEN_API_TOKEN**\
  Token to access the aktivitetstillfallen API.
- **KOPPS_API_URL**\
  URL to the KOPPS API v2.
