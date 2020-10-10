/* IMPORTS */

/* Dependencies */

const { App } = require("@slack/bolt");
const fetch = require("node-fetch");
const { URL, URLSearchParams } = require("url");
const cdfLib = require("@foretold/cdf");
const guesstimatorLib = require("@foretold/guesstimator/dist/index.js");
const math = require("mathjs");

/* Modules */
// const store = require("./store");
const question_modal = require("./question_modal");

/* Library module */
const lib = require("./lib")

const request = lib.request

const create_question = lib.create_question
const predict = lib.predict

const update_user_slack_channel_and_title = lib.update_user_slack_channel_and_title
const open_prediction_modal = lib.open_prediction_modal
const get_foretold_channel_options = lib.get_foretold_channel_options

const qID_from_data = lib.qID_from_data
const get_numerical_input_and_comment = lib.get_numerical_input_and_comment
const an_evil_robot_has_taken_over_your = lib.an_evil_robot_has_taken_over_your
const error_direct_message = lib.error_direct_message
const getAndSetAgentId = lib.getAndSetAgentId

/* db */
const db = require("./db");
let getUserAtAllCosts = db.getUserAtAllCosts
let getUser = db.getUser
let getUserVariable = db.getUserVariable
let setUserVariable = db.setUserVariable

let getChannelVariable = db.getChannelVariable
let channelIncreaseCounter = db.channelIncreaseCounter

/* SETTING UP THE APP */

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN
});


/* CREATING QUESTIONS */
/* Listen for an action which turns a message into a question */

app.action({ callback_id: 'question_from_message' }, ({ ack, payload, context }) => {
  console.log("Function = app.action({ callback_id: 'question_from_message' }, ({ ack, payload, context }) => {")
  console.log("<payload>")
  console.log(payload)
  console.log("/<payload>")
  
  /*if(payload.channel.name == "directmessage"){
      
    let slack_channel_id = payload.channel.id;
    let user_id = payload.user.id;
    error_direct_message("create a question", {app, ack}, {slack_channel_id, user_id})
        
  }else{
  */
    let user_name = payload.user.name;
    let user_id = payload.user.id;
    getUserAtAllCosts(user_id)
    let slack_channel_id = payload.channel.id;
    let title = payload.message.text;

    // Create an entry in the store to save user details (e.g. their choices when they press buttons)
    update_user_slack_channel_and_title(user_id, slack_channel_id, title)

    // Open the modal so that the user can enter the prediction
    open_prediction_modal(app, {ack, payload, context}, title); 
  //}
  
  console.log("Ending: Function = app.action({ callback_id: 'question_from_message' }, ({ ack, payload, context }) => {")
});

/*Listen for a ping*/
app.command("/ping", ({ ack, payload, context }) => {

  console.log('Function = app.command("/ping", ({ ack, payload, context }) => {')
  console.log("<payload>")
  console.log(payload)
  console.log("/<payload>")
  
  console.log("<context>")
  console.log(context)
  console.log("/<context>")
  
  ack("Ping received");
  
});

/* Listen for a /predict slash command invocation */
app.command("/predict", ({ ack, payload, context }) => {

  console.log('Function = app.command("/predict", ({ ack, payload, context }) => {')
  console.log("<payload>")
  console.log(payload)
  console.log("/<payload>")
  
  /*if(payload.channel_name == "directmessage"){
    
    let slack_channel_id = payload.channel_id;
    let user_id = payload.user_id;
    error_direct_message("create a question", {app, ack}, {slack_channel_id, user_id})
        
  }else{
  */
    let user_name = payload.user_name; 
    let user_id = payload.user_id; 
    getUserAtAllCosts(user_id)
    let slack_channel_id = payload["channel_id"];
    let title = payload.text;

    setUserVariable(user_id, "direct_message", (payload.channel_name == "directmessage"))
    
    // Create an entry in the store to save user details (e.g. their choices when they press buttons)
    update_user_slack_channel_and_title(user_id, slack_channel_id, title)

    // Open the modal so that the user can enter the prediction
    open_prediction_modal(app, {ack, payload, context}, title);
  
  //}
    console.log('Ending: Function = app.command("/predict", ({ ack, payload, context }) => {')
});

/* Listen for an options request. */
app.options("channel_picker", async ({ options, ack }) => {
  // https://github.com/slackapi/bolt/blob/master/docs/_basic/listening_responding_options.md

  console.log('Function = app.options("channel_picker", async ({ options, ack }) => {')
  console.log("<options>")
  console.log(options)
  console.log("/<options>")
  
  var user_id = options.user.id || options.user_id;
  
  // Get a list of Foretold channels for the user to select from (the id below is my agent id).
  // TODO find a way to get a users Foretold agent id from within Slack (some kind of authing)
  // Waiting for Ozzie on being able to get the agent id from the foretold token.
  // Right now, Jacob is the only one for which this should work
  // "b379af0e-21db-4f17-9777-842b9f76ce76"
  var foretold_channels = await get_foretold_channel_options(
    getUserVariable(user_id, "foretold_agent_id"), user_id
  );

  ack(foretold_channels);
  console.log('Ending: Function = app.options("channel_picker", async ({ options, ack }) => {')
});

/* Listen for a button invocation with action_id `Resolution` (assume it's inside of a modal) */
app.action("Resolution", ({ ack, body, context }) => {
  console.log('Function = app.action("Resolution", ({ ack, body, context }) => {')
  console.log("<body>")
  console.log(body)
  console.log("/<body>")
  
  // Acknowledge the button request
  ack();

  // Get and store the resolution date
  let user_id = body.user.id || body.user_id;
  let resolution_date = body.actions[0].selected_date;
  setUserVariable(user_id, "resolution", resolution_date)
  console.log('Ending: Function = app.action("Resolution", ({ ack, body, context }) => {')
});


/* Listen for a button invocation with action_id `quesion_type` (assume it's inside of a modal) */
app.action("question_type", ({ ack, body, context }) => {
  console.log('Function = app.action("question_type", ({ ack, body, context }) => {')
  console.log("<body>")
  console.log(body)
  console.log("/<body>")
  

  // Acknowledge the button request
  ack();
  
  // Get key variables, and store question_type for later use
  let question_type = body.actions[0].selected_option.value;
  let user_name = body.user.username;
  let user_id = body.user.id;
  let user = getUserAtAllCosts(user_id)
  let title = getUserVariable(user_id, "title");
  console.log("QUESTION TYPE HAS BEEN SET TO:", question_type)
  setUserVariable(user_id,"question_type", question_type)

  // Remove option for selecting min and max if user picks "binary", using views.update()
  if(question_type == "PERCENTAGE"){
    let question_view_updated = question_modal.q_view(title);
    question_view_updated.blocks = question_view_updated.blocks.slice(0,6) 
        // this deletes the last two, which are min and max.
    
    // Update the modal view:
    try {
      const result = app.client.views.update({
        token: context.botToken,
        view_id: body.view.id,
        view: question_view_updated
      });
    } catch (error) {
      console.error(error);
    }
    
  }else{
    // Update the modal view to something which *does* have the min/max fields.
    // One might think that this is redundant, but it isn't: 
    // what if the user toggles back and forth between binary and numeric?
    try {
      const result = app.client.views.update({
        token: context.botToken,
        view_id: body.view.id,
        view: question_modal.q_view(title)
      });
    } catch (error) {
      console.error(error);
    }
    
    
  }
  console.log('Ending: Function = app.action("question_type", ({ ack, body, context }) => {')
});

/* Pick a foretold community/channel */
app.action("channel_picker", async ({ ack, body, context }) => {
  console.log('Function = app.action("channel_picker", async ({ ack, body, context }) => {')
  console.log("<body>")
  console.log(body)
  console.log("/<body>")
  
  // Acknowledge the channel picker request
  ack();

  let user_name = body.user.username;
  let user_id = body.user.id;  
  let foretold_channel_id = body.actions[0].selected_option.value;
  setUserVariable(user_id, "foretold_channel_id", foretold_channel_id)

  console.log('Ending: Function = app.action("channel_picker", async ({ ack, body, context }) => {')

});

/* Handle a view_submission event */
app.view("modal-identifier", async ({ ack, body, view, context }) => {
  
  console.log('Function = app.view("modal-identifier", async ({ ack, body, view, context }) => {')
  console.log("<body>")
  console.log(body)
  console.log("</body>")
  
  // Acknowledge the view_submission event
  ack();
  
  // Get data from the store.
  let user_name = body.user.username || body.user.name;
  let user_id = body.user.id || body.user_id; // Because predict and transform message give different bodies
  let user = getUserAtAllCosts(user_id)
  // let foretold_channel_id = getUserVariable(user_id, "foretold_channel_id");
  let slack_channel_id = getUserVariable(user_id, "slack_channel_id");
  
  // Extract submission values and create GraphQL query

  const values = view["state"]["values"];
  const title = values["Title"]["title"]["value"];

  let question_type = getUserVariable(user_id, "question_type")
  const value_type = question_type ? question_type : "FLOAT";
  
  var description;
  try{                description = values["Description"]["desc"]["value"];
  }catch(error){      description = ''
  }
  
  if(value_type != "PERCENTAGE"){
    var min
    var min_query_text
    var max
    var max_query_text 
    var description
    try{
      min = parseInt(values["Min"]["min"]["value"]);
      min_query_text = Number.isNaN(min) ? "" : `min: ${min}`;
      max = parseInt(values["Max"]["max"]["value"]);
      max_query_text = Number.isNaN(max) ? "" : `max: ${max}`;
      
    }catch(error){
      console.log("This happens sometimes with mobile devices")
      min_query_text = ''
      max_query_text = ''      
    }
  }else{
      var min_query_text = "";
      var max_query_text = "" ;
  }
  
  const resolution_block = view["blocks"].find(
    element => element.block_id === "resolution_date"
  );
  
  let user_resolution = getUserVariable(user_id, "resolution")
  const resolution_date = user_resolution ? user_resolution : resolution_block["accessory"]["initial_date"];

  // Create the question
  // To make custom community posting work, delete the next line:
  let foretold_channel_id = "e351f8f3-cf9c-4787-a787-68257220084d"// "ec96af95-cd61-403e-99d3-1875d2f4787b" // "e351f8f3-cf9c-4787-a787-68257220084d" //

  const response = await create_question({title, description, value_type, foretold_channel_id, min_query_text, max_query_text, resolution_date}, user_id)
  const measurable_id = response.data.measurableCreate.id;
  
  // Define the message sent to the user
  let msg = "";
  // TODO: handle errors from foretold (create_question), instead of if(1) & add better error messages.

  if (1) {
    msg =
`<@${user_id}> added a new question: 
  
  > ${title}
  
  - Browse it: https://www.foretold.io/c/${foretold_channel_id}/m/${measurable_id}`
    
    let counter = getChannelVariable(slack_channel_id, "counter") || 0;
    
    if(counter < 5 || math.random()<0.2){
      let msg_extension=`
  - Predict the result: answer this message in a thread, starting with the keyword "update". 
        - E.g.: update 1 to 10
        - E.g.: update 1 to 10; this is an optional comment.
        - E.g.: update 90%; this applies to binary questions
  - Create another question: 
        - Start a message with the /predict command
                - E.g.: /predict When will the world end?
        - Click on a message -> [...] -> More actions -> Create Question 
      `;
      msg = msg + msg_extension
    }
    
  } else {
    msg = "There was an error with your submission";
  }
  
  // Message the user
  
  let already_error=false;
  
  try {
    app.client.chat.postMessage({
      token: context.botToken,
      channel: slack_channel_id,
      text: msg
    });
    
  } catch (error) {
      console.error(error);
      already_error=true;
  }
  
  // If the above didn't work:
  if(getUserVariable(user_id, "direct_message") || already_error){
    // Send the same message as ephemeral, and a warning.
    msg = `<@${user_id}> added a new question: ${title}
  - Browse it: https://www.foretold.io/c/${foretold_channel_id}/m/${measurable_id}`

   //error_direct_message(msg, "create a question", {app}, {slack_channel_id, user_id})

    let string = "create a question"
    let error_msg = `It looks like you tried to ${string} in a direct message, but this doesn't work so well. Instead, you can try to:
          - Create a small group with you and the other person, and invite the foretold app
          - Use a channel to which the foretold app has already been invited
    `;

     try {
       app.client.chat.postEphemeral({
          token: process.env.SLACK_BOT_TOKEN,
          channel: slack_channel_id,
          user: user_id,
          text: msg,
      });    
      app.client.chat.postEphemeral({
          token: process.env.SLACK_BOT_TOKEN,
          channel: slack_channel_id,
          user: user_id,
          text: error_msg,
      });
    } catch (error) {
        console.error(error);
    }

    // Don't send any more error messages, in order to not confuse the user.
    already_error = true

  }else{
    
    /* // Don't send the ephemeral message for now. 
    var user_identified = getUserVariable(user_id, "user_foretold_token");
    if(user_identified == undefined || user_identified ==  process.env.FORETOLD_TOKEN || user_identified == 0){
    // Only give the user one message at a time
    // Message the user if they're not identified
    
      msg = an_evil_robot_has_taken_over_your("question")
      
      try {
        app.client.chat.postEphemeral({
            token: process.env.SLACK_BOT_TOKEN,
            channel: slack_channel_id,
            user: user_id,
            text: msg,
        });
      } catch (error) {
          console.error(error);
        }
    }
    */
  }

  console.log('Ending: Function = app.view("modal-identifier", async ({ ack, body, view, context }) => {')

});

/* UPDATING ANSWERS */
/* Listens for a message starting with "update " inside a thread which starts with a question, and makes a prediction with the command that follows. */
// example: update 10 to 100

function updateForUpperAndLowerCase({message, say}){
  console.log('Function = app.message("update", ({ message, say }) => {')
  console.log("<message>")
  console.log(message)
  console.log("</message>")
  //if(message.channel_type == "dm"){
    
      let slack_channel_id = message.channel;
      let user_id = message.user;
      getUserAtAllCosts(user_id);
      let empty_ack = () => {}
      // error_direct_message("update a prediction", {app, empty_ack}, {slack_channel_id, user_id})

  //}
  
  if (
    (message.text.substring(0, "update ".length) == "update " || message.text.substring(0, "Update ".length) == "Update " ) &&
    (message.ts != message.thread_ts) && // if it isn't a top level comment, but is instead inside a slack thread
    (message.ts != undefined ) && (message.thread_ts != undefined)
  ) {


    
    let user_id = message.user;    
    let ts = message.ts == message.thread_ts ? message.ts : message.thread_ts; // The parent message of the thread

    let url = new URL("https://slack.com/api/conversations.history");
    let params = {
      token: process.env.SLACK_BOT_TOKEN,
      channel: message.channel,
      latest: ts,
      limit: 1,
      inclusive: true
    };
    url.search = new URLSearchParams(params).toString();
    console.log("<url>")
    console.log(url)
    console.log("</url>")

    // We extract the numerical_input and the comment from the message text
    let text_processed = get_numerical_input_and_comment(message.text)
    let numerical_input = text_processed.numerical_input;
    let comment = text_processed.comment;
    let errorMessage = "";
    let errorSituation = false;
    
    fetch(url)
      .then(response => response.json())
      .then(async data => {
        // Check that API call was succesful
        if (data.ok == true) {
          
          // Extract prediction from parent message and post to Foretold
          let questionID = qID_from_data(data);

          let bounds_query = `{
            measurable(id:"52e9d764-e50f-474a-a75c-193262871a32") {
              min
              max
            }
          }`;

          // These bounds are currently not being used due to a bug in GuesstimatorLib. 
          // Waiting for Ozzie to get back to me (Jacob) on that
          
          // let bounds = await request(bounds_query);
          // let min_bound = bounds.data.measurable.min;
          // let max_bound = bounds.data.measurable.max;

          // Submit a prediction via the Foretold API

          predict(questionID, numerical_input, comment, user_id);
          
        } else {
          // In case API call wasn't succesful
          console.log("Couldn't post to Foretold API, error: ", data.error);
          errorMessage = data.error;
          errorSituation = true;
        }
      });

    // We confirm by sending a message in the same thread
  
    console.log("<errorSituation>")
    console.log(errorSituation)
    console.log("</errorSituation>")
    
    let reply = "";
    if(errorSituation){
      reply = errorMessage;
    } else {
      reply = `Hey there <@${user_id}>, your update "${numerical_input}" has been recorded`;
      if(comment!=""){
        reply = reply +  `, as well as your comment "${comment}"`;
      }
    }
    
    console.log("<reply>")
    console.log(reply)
    console.log("</reply>")
    
    say({
      text: reply,
      thread_ts: ts
    });
        
    var user_identified = getUserVariable(user_id, "user_foretold_token");
    
    if(user_identified==undefined || user_identified == process.env.FORETOLD_TOKEN || user_identified==0){
        let msg = an_evil_robot_has_taken_over_your("prediction")
      
        app.client.chat.postEphemeral({
          token: process.env.SLACK_BOT_TOKEN,
          channel: message.channel,
          user: user_id,
          text: msg,
          thread_ts: ts
        });
    }
  
  }
  console.log('Ending: Function = app.message("update", ({ message, say }) => {')
}

app.message("update", ({ message, say }) => {
  updateForUpperAndLowerCase({message, say})

});

app.message("Update", ({ message, say }) => {
  updateForUpperAndLowerCase({message, say})

});

/*Listening for confidence casually*/

app.message(/(.*)p~(\d+)%|(.*)c~(\d+)/, async ({ context, say, message }) => {
  // RegExp matches are inside of context.matches
  const matches = context.matches;
  
  console.log('Function = app.message(/(.*)p~(\d+)%|(.*)c~(\d+)/, async ({ context, say, message }) => {')
  console.log("<message>")
  console.log(message)
  console.log("</message>")
  
  let user_slack_id = message.user
  //let user_foretold_id = getUserVariable(user_slack_id, "user_foretold_token")
  
  let withPercentQuestion = matches[1]
  let withPercentConfident = matches[2]

  let description = ""
  let value_type = "PERCENTAGE"
  let foretold_channel_id = "1c3f2733-91ac-4eb1-ba04-e97533013c97" // "af573e01-c7d4-4dbc-bb10-2b7c08f8e147" // Impromptu questions
  let min_query_text = ""
  let max_query_text = ""
  let resolution_date = new Date(Date.now() + 30*24*60*60*1000) // In one month


  if(withPercentQuestion!=undefined && withPercentConfident!=undefined){
    let title = withPercentQuestion
    
    const response = await create_question({title, description, value_type, foretold_channel_id, min_query_text, max_query_text, resolution_date}, user_slack_id)
    const question_id = response.data.measurableCreate.id;
    predict(question_id, withPercentConfident, "", user_slack_id);
    
    let theBotSays = `<@${user_slack_id}> added a new impromptu question!
  - Title: ${title}
  - First update: ${withPercentConfident}%
You may:
  - Browse it: https://www.foretold.io/c/${foretold_channel_id}/m/${question_id}
  - Predict the result: answer this message in a thread, starting with the keyword "update". 
  - Or create an impromptu question by writting a message similar to: "X will happen p~95%"
`
    say({
      text: theBotSays
    });
  }
  
  let withoutPercentQuestion = matches[3]
  let withoutPercentConfident = matches[4]
  
  if(withoutPercentQuestion!=undefined && withoutPercentConfident!=undefined){
    let title = withoutPercentQuestion
    
    const response = await create_question({title, description, value_type, foretold_channel_id, min_query_text, max_query_text, resolution_date}, user_slack_id)
    const question_id = response.data.measurableCreate.id;
    predict(question_id, withoutPercentConfident, "", user_slack_id);
    
    // /n->2^n/(2^n+1)
    let term = math.pow(2,withoutPercentConfident)
    let percentConfident = 100* term / (1+term)
    let theBotSays = `<@${user_slack_id}> added a new impromptu question!
  - Title: ${title}
  - First update: ${percentConfident}% = c~${withoutPercentConfident}, where c~: n-> 2^n / (2^n+1)
You may:
  - Browse it: https://www.foretold.io/c/${foretold_channel_id}/m/${question_id}
  - Predict the result: answer this message in a thread, starting with the keyword "update". 
  - Or create an impromptu question by writting a message similar to: "X will happen c~${withoutPercentConfident}"
`
    say({
      text: theBotSays
    });
  }
  
  console.log("<matches>")
  console.log(matches)
  console.log("</matches>")
  
  console.log('Ending: Function = app.message(/(.*)p~(\d+)%|(.*)c~(\d+)/, async ({ context, say, message }) => {')
});

/* AUTHENTICATING */
app.message("identify me as", ({ message, say }) => {
  
  console.log('Function = app.message("identify me as", ({ message, say }) => {')
  console.log("<message>")
  console.log(message)
  console.log("</message>")
  
  // Two different things.
  // Token
  // Agent id
  // We want both, but I'll first get the token.
  
  let keyword = "identify me as "
  
  if (message.text.substring(0, keyword.length) == keyword) {
        
    let user_id = message.user
    let ts = message.ts;
    let user_foretold_token = message.text.replace(keyword, "")
    
    getUserAtAllCosts(user_id);
    setUserVariable(user_id, "user_foretold_token", user_foretold_token)
    let agent_id = getAndSetAgentId(user_id)
    
    let reply = `Identification complete`;
    say({
      text: reply
      
    });
  }
  console.log('Ending: Function = app.message("identify me as", ({ message, say }) => {')
});

app.message("forget me", ({ message, say }) => {
  
  console.log('Function = app.message("forget me", ({ message, say }) => {')
  console.log("<message>")
  console.log(message)
  console.log("</message>")
  
  // Two different things.
  // Token
  // Agent id
  // We want both, but I'll first get the token.
  
  let keyword = "forget me"
  
  if (message.text.substring(0, keyword.length) == keyword) {
    let user_id = message.user
    let ts = message.ts;
    
    setUserVariable(user_id, "user_foretold_token", process.env.FORETOLD_TOKEN)    // store.getUser(user_id)["user_foretold_token"] = undefined;
    // save_the_store();
    
    let reply = "You have been erased from the records.";
    say({
      text: reply
      
    });
  }
  console.log('Ending: Function = app.message("forget me", ({ message, say }) => {')
});

app.message("default channel to ", ({ message, say }) => {
  
  console.log('Function = app.message("default channel to ", ({ message, say }) => {')
  console.log("<message>")
  console.log(message)
  console.log("</message>")
  
  // Two different things.
  // Token
  // Agent id
  // We want both, but I'll first get the token.
  
  let keyword = "default channel to "
  
  if (message.text.substring(0, keyword.length) == keyword) {
        
    let user_id = message.user
    let ts = message.ts;
    let default_channel = message.text.replace(keyword, "")
    
    getUserAtAllCosts(user_id);
    setUserVariable(user_id, "default_channel", default_channel)
    
    let reply = "Default channel set. [not true yet]";
    say({
      text: reply
      
    });
  }
    console.log('Ending: Function = app.message("default channel to ", ({ message, say }) => {')
});


/* START THE APP*/
(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("Bolt app is running.");
})();

