# Slack Bolt - Foretold Slack integration

This is a simple example App built with [Slack's Bolt Framework](https://slack.dev/bolt/tutorial/getting-started) for node.js.

Our App integrates foretold and slack

## Structure:
- .env: Contains a few key tokens, necessary for authorization
- lib: contains the internal machinery of the app.
- package.json: contains dependencies
- question_modal: Contains a particularly tricky piece of code: the one needed to open a modal in slack
- server: contains the body of the app. Each function should be human-readable, and general.
- lowdb: A database for user keys, preferences, and eventually temporary question details.

## Lib.js
### /* GUESSTIMATOR */
Functions that use the guesstimator library  
In action: https://observablehq.com/@oagr/guesstimator-library  

### /* FORETOLD */
#### /* FORETOLD: GraphQL API */
Interacts with Foretold's not trivial GraphQL API.  
Key function: request(a query, as a user)  
More info: https://api.foretold.io/graphql -> Docs on the right hand side  
In action: https://observablehq.com/@jjj/bot-tips  

#### /* FORETOLD: Actions, like those a user could do*/
Create a question. Predict the answer  

#### /* FORETOLD AND SLACK */
Different APIs. Some oil is needed for them to interact smoothly.  

### /* MISC HELPER FUNCTIONS */
Like: an_evil_robot_has_taken_over_your(keyword).   
These functions exist in order to make the code in server.js more readable, and in order to not repeat code.   

## package.json
Nothing much to say  
Babel could be added.  

## question_modal.js
Exists to separate the modal from anything else  

## Server.js
Imports are presented roughly according to the above order in lib.js  

Console.log messages follow the convention:  
- Name of the function  
- The most important argument fed to it.  

### /* CREATING QUESTIONS */

"question from message" and "predict" are different objects/methods.  
- question from message: when a user clicks on a message ... -> Create question   
- when a user starts writting the /predict keyword.  

But they both create a question, and open a modal, and are thus very similar. The process they set in motion is the same  

- channel picker | options: which options are fed to the user when the modal appears?  
- resolution: deals with the date.  
- question_type: what happens if the question is a binary question.  
- channel picker | action: what happens when a user picks a foretold channel?
- modal-identifier: What happens when the modal is finally submitted?

### /* UPDATING ANSWERS */

- update: What happens when a user answers a thread with "update 1 to 20"

### /* AUTHENTICATION */

- identify me as: associate a token with a given slack user
- forget me: forget my token

## lowdb.js
https://gittypicode.github.io hub.com/typicode/lowdb
Has solved a lot of bugs, and I am grateful

## db.json
The database which lowdb uses

### /* USERS */

### /* CHANNELS */

# Testing

While anonymous:
- Create a question
  - with predict
  - by transforming a message
- Update a question

While identified
- Create a question
  - with predict
  - by transforming a message
- Update a question

Create a question:
  - Binary
  - Change the date
  - Description.
  
Where:
  - On a direct message
  - On a channel

Update a question
  - A numerical question
  - A binary question
  
## Gotchas
If hosted on a platform such as glitch, a premium version is needed; otherwise, the app goes to sleep and ignores the incoming requests. 

In this example, all questions go to the [Public testing ground community](https://www.foretold.io/c/e351f8f3-cf9c-4787-a787-68257220084d). To change this, change the line `let foretold_channel_id = "e351f8f3-cf9c-4787-a787-68257220084d"` in the file server.js

Forecasting on more than one community doesn't exist as a feature in this bridge. To add it, users would have to identify themselves, then a request would have to be sent to foretold to see which communities the user belongs to, and these communities would be presented on a drop-down button. But this doesn't work in foretold, because bots don't belong to the same communities as their owners. 

Authentication works best when:
- All users forecast anonymously in one public community, using a common bot token (the default foretold token in the `.env` file).
- All users identify themselves with a bot they own in a public community. They can do this once, by sending "indentify me as bottoken" to the foretold user on slack.

Authentication doesn't work so well in private communities. 
