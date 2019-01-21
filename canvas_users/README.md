Canvas Users
============
This tiny app takes a csv-file containing users and tries to create them in your Canvas instance of choice.

CSV requirements
----------------
The csv-file should, at least, contain the following columns to work properly:
- `user_id`
- `login_id`
- `first_name`
- `last_name`
- `email`

The creation process
--------------------------
The app uses the Canvas LMS API endpoint `POST /api/v1/accounts/:account_id/users`. Using the following pre-set attributes:
- `pseudonym[skip_registration]: true`
- `pseudonym[send_confirmation]: false`
- `communication_channel[skip_confirmation]: true`
- `enable_sis_reactivation: false`
