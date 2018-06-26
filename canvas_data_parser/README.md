### Canvas Data Parser
This catalog contains a program for parsing through a local sync of Canvas Data, looking for matches of a particular kth video url. A summary is then printed listing courses and number of matches, coupled with email information for people responsible for the course. Only certain catalogs of interest are parsed:
- discussion_topic_dim
- module_item_dim
- quiz_dim
- assignment_dim
- wiki_page_dim
- course_dim
- submission_comment_dim
- external_tool_activation_dim
- quiz_question_dim
- discussion_entry_dim
- submission_dim
- conversation_message_dim

The program requires [ripgrep](https://github.com/BurntSushi/ripgrep) to be installed. To run the program, one needs to supply a url to where the Canvas Data has been synced as a command line argument:
```
npm install
npm start <insert url here, e.g. /Users/MyUserName/MyData/dataFiles>
```