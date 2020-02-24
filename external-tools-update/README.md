## A simple app to batch-update external tools in Canvas

Useful if you install tools per course (not per account), and you need to change something in the configuration.


### How to use

1. Fill in .env file
2. Know exact External Tool Name
3. Know which account you want to apply changes to
4. Know which fields you want to change with this tool. Right now possible are:
    * name
    * url
    * domain
5. `npm start` to run the app. Fill the values into inquirer.
6. Wait for app to scrub the account in search of the provided tool name.
7. Check found tools and courses, if correct, proceed.
6. Check if values were updated correctly, and hopefully you're done!

*Note:* Example external tool object below.
You can change fields that can be modified in `inquirerQuestions` variable under `toolFields`.
`toolFields` object is passed directly as `body` in PUT request to the API.


### Example External Tools Object

```
{
  "id": 1,
  "domain": "domain.example.com",
  "url": "http://www.example.com/ims/lti",
  "consumer_key": "key",
  "name": "LTI Tool",
  "description": "This is for cool things",
  "created_at": "2037-07-21T13:29:31Z",
  "updated_at": "2037-07-28T19:38:31Z",
  "privacy_level": "anonymous",
  "custom_fields": {"key": "value"},
  "account_navigation": {
       "canvas_icon_class": "icon-lti",
       "icon_url": "...",
       "text": "...",
       "url": "...",
       "label": "...",
       "selection_width": 50,
       "selection_height":50
  },
  "assignment_selection": null,
  "course_home_sub_navigation": null,
  "course_navigation": {
       "canvas_icon_class": "icon-lti",
       "icon_url": "...",
       "text": "...",
       "url": "...",
       "default": "disabled",
       "enabled": "true",
       "visibility": "public",
       "windowTarget": "_blank"
  },
  "editor_button": {
       "canvas_icon_class": "icon-lti",
       "icon_url": "...",
       "message_type": "ContentItemSelectionRequest",
       "text": "...",
       "url": "...",
       "label": "...",
       "selection_width": 50,
       "selection_height": 50
  },
  "homework_submission": null,
  "link_selection": null,
  "migration_selection": null,
  "resource_selection": null,
  "tool_configuration": null,
  "user_navigation": {
       "canvas_icon_class": "icon-lti",
       "icon_url": "...",
       "text": "...",
       "url": "...",
       "default": "disabled",
       "enabled": "true",
       "visibility": "public",
       "windowTarget": "_blank"
  },
  "selection_width": 500,
  "selection_height": 500,
  "icon_url": "...",
  "not_selectable": false
}
```
