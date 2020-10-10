/* DEPENDENCIES */

var cdfLib = require("@foretold/cdf");
var guesstimatorLib = require("@foretold/guesstimator/dist/index.js");
const fetch = require("node-fetch");
const fs = require('fs');

/* MODULES */
const question_modal = require("./question_modal");

/* db */
const db = require("./db");
let getUserAtAllCosts = db.getUserAtAllCosts
let getUser = db.getUser
let getUserVariable = db.getUserVariable
let setUserVariable = db.setUserVariable
let channelIncreaseCounter = db.channelIncreaseCounter

/* HELPER FUNCTIONS */

/* GUESSTIMATOR */
/* GuesstimatorInputToCdf("1 to 100", 1000, 1000, 30) -> produces a cdf */
function guesstimatorInputToCdf({
  guesstimatorInput,
  simulationSampleCount,
  outputSampleCount,
  smoothingWidth,
  min,
  max
}) {
  let toSamples = inputToSamples({
    input: guesstimatorInput,
    simulationSampleCount: simulationSampleCount
  });
  var samp = new cdfLib.Samples(toSamples.values);
  return samp.toCdf({
    size: outputSampleCount,
    width: smoothingWidth,
    min: min,
    max: max
  });
}

/* Takes an imput, produces some samples */
function inputToSamples({ input, simulationSampleCount }) {
  let parsedInput = guesstimatorLib.Guesstimator.parse({ text: input })[1];
  let parsed = new guesstimatorLib.Guesstimator({ parsedInput });

  return parsed.parsedInput.sample(simulationSampleCount);
}

/* FORETOLD */

/* FORETOLD: GraphQL API */

const main_url = "https://api.foretold.io/graphql?token=";

const HEADERS = {
  "Accept-Encoding": "gzip, deflate, br",
  "Content-Type": "application/json",
  Accept: "application/json",
  Connection: "keep-alive",
  DNT: "1",
  Origin: "https://api.foretold.io"
};

var options = query => ({
  method: "POST",
  headers: HEADERS,
  body: JSON.stringify({ query })
});

async function request(query, user_id) {
  
  
  console.log("\n> request")
  console.log("The user_id is", user_id)
  
  let user_foretold_token = process.env.FORETOLD_TOKEN
  if(user_id != 0){
      user_foretold_token = getUserVariable(user_id, "user_foretold_token")
  }
  
  let token = user_foretold_token ? user_foretold_token : process.env.FORETOLD_TOKEN
  
  console.log("<token>")
  console.log(token)
  console.log("</token>")
  
  console.log("<query>")
  console.log(query)
  console.log("</query>")
  
  console.log("End of request\n")
  
  return await fetch(main_url + token, options(query)).then(response =>
    response.json()
  );
}

exports.request = request

async function getAndSetAgentId(user_id){
  let query = `{
authenticated{
  bot{
    id
    agentId
    userId
  }
  user{
    id
    agent{
      id
    }
  }
}
}
  `

  let queryFromBotToUsersAgentId = (foretold_user_id, user_id) => {
    return request(`{
      user(id: "${foretold_user_id}"){
        agentId
      }

    }`, user_id)
  }
  let answer = await request(query, user_id) 
  console.log("answer", answer)
  var agent_id;
  try{
    answer = answer.data.authenticated
    console.log("answer", answer)
    if(answer.bot != null){
      let foretold_user_id= answer.bot.userId;
      let answer = await queryFromBotToUsersAgentId(foretold_user_id, user_id)
      agent_id = answer.data.user.agentId
    }else if(answer.user != null){
      agent_id= answer.user.agent.id;
    }else{
      throw("Error in getAgentId: The answer was received but it contained neither user not bot")
    }
    
  }catch(error){
      throw("Error in getAgentId. We knew that this was, at some point, going to break. The time has now come. The solution is to see what has changed in https://api.foretold.io/graphql")
  }
  setUserVariable(user_id, "foretold_agent_id", agent_id)
  console.log("Agent_ID", agent_id)
}
exports.getAndSetAgentId = getAndSetAgentId


/* FORETOLD: Actions, like a those a user could do*/

/* Create question in foretold*/
function create_question({title, description, value_type, foretold_channel_id, min_query_text="", max_query_text="", resolution_date}, user_id = undefined){
    const query = `mutation {
      measurableCreate(input: {
        name: "${title}"
        labelCustom: "${description}"
        valueType: ${value_type}
        channelId: "${foretold_channel_id}"
        ${min_query_text}
        ${max_query_text}
        expectedResolutionDate: "${resolution_date}"
      }) {
        id
      }
    }`;
  
  // console.log("USER_ID =")

  //console.log("user_id create_question")
  //console.log(user_id)

  return request(query, 0)//user_id); // the return must be awaited
  // await create_question()
}

exports.create_question = create_question

/* Predict: updates a question. For example, update 1 to 10*/
const predict = (questionID, user_input, comment="", user_id) => {

  //let type_of_question = getUserVariable(user_id, "question_type");
  let reg_binary_or_not = /( to )|(=)/
  user_input = user_input.replace("\n", "");
  //let type_of_question = 
  //    (user_input.match(reg_binary_or_not) == null ) ? "BINARY" : "DISTRIBUTION"
  
  let type_of_question = 
      (user_input.includes("to") || user_input.includes(")") ) ? "DISTRIBUTION" : "BINARY"
  
  console.log("<user_input>")
  console.log(user_input)
  console.log("</user_input>")
  
  console.log("<type of question>")
  console.log(type_of_question)
  console.log("</type of question>")
  
  if(type_of_question == "DISTRIBUTION"){
    
    let cdf = guesstimatorInputToCdf({
      guesstimatorInput: user_input,
      simulationSampleCount: 10000,
      outputSampleCount: 1000,
      smoothingWidth: 30,
      min: undefined, //bounds.data.measurable.min,
      max: undefined //bounds.data.measurable.max
    });
    
     // https://observablehq.com/@jjj/bot-tips
    var query = `mutation {
                measurementCreate(input: {
                  value: {
                    floatCdf: { 
                      xs: [${cdf.xs}]
                      ys: [${cdf.ys}]
                    }
                  }
                  valueText: "${user_input}"
                  description: "${comment}"
                  competitorType: COMPETITIVE
                  measurableId: "${questionID}"
                }) {
                  id
                }
              }`;
  }else{
      user_input = user_input.replace("%", "") // 40% -> 40
      var query = `mutation {
              measurementCreate(input: {
                value: {
                  percentage: ${user_input}
                }
                valueText: "${user_input}"
                description: "${comment}"
                competitorType: COMPETITIVE
                measurableId: "${questionID}"
              }) {
                id
              }
            }`;
  }

  request(query, user_id);
}
exports.predict = predict

/* FORETOLD AND SLACK */

/* Warns if messages are made in a direct channel */

function error_direct_message(msg, string, {app}, {slack_channel_id, user_id}){
  
  //ack();
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
  
}
exports.error_direct_message = error_direct_message

/* Prepares foretold channels for the format slack accepts according to https://api.slack.com/reference/block-kit/block-elements#channel_select */
var get_foretold_channel_options = async (agentId, user_id) => {
  const channels_query = `{
    agentChannels(
      agentId: "${agentId}"
      first:50
      minNumberOfPredictions:0
    ) {
      total
      edges {
        node {
          channel { 
            id
            name
          }
        }
      }
    }
  }`;

  const response = await request(channels_query, user_id);

  // TODO add a check that the api call was succesful

  const channels_arr = response.data.agentChannels.edges;

  var options_arr = channels_arr.map(el => ({
    text: {
      type: "plain_text",
      text: el.node.channel.name
    },
    value: el.node.channel.id
  }));

  return {
    options: options_arr
  };
};
exports.get_foretold_channel_options = get_foretold_channel_options;

/* Updates the store with the data we'll need when we open a modal*/
function update_user_slack_channel_and_title(user_id, slack_channel_id, title){
  
  // Create an entry in the store to save user details (e.g. their choices when they press buttons)
  // Create an entry in the store to save channel details (e.g. how many predictions have been created in the channel)
  
  getUserAtAllCosts(user_id); 
  
  channelIncreaseCounter(slack_channel_id);
  
  // Save the id for which channel the command was invoked in, & the title of the question.
  
  setUserVariable(user_id, "slack_channel_id", slack_channel_id)  
  setUserVariable(user_id, "title", title)  


}
exports.update_user_slack_channel_and_title = update_user_slack_channel_and_title;

/* open a modal for a prediction to be made*/
function open_prediction_modal(app, {ack, payload, context}, title){
  
  // Acknowledge the command request
  ack();
  
  // Return a view payload to open up a modal window
  try {
    const result = app.client.views.open({
      token: context.botToken,
      // Pass a valid trigger_id within 3 seconds of receiving it
      trigger_id: payload.trigger_id,
      // View payload
      view: question_modal.q_view(title)
    });

  } catch (error) {
    console.error(error);
  }
  console.log("Exiting open_prediction_modal")

}

exports.open_prediction_modal = open_prediction_modal;

/* STORE */
/* MISC HELPER FUNCTIONS */

/* Warning message that the user has not been identified*/
function an_evil_robot_has_taken_over_your(keyword){
  
  let msg = `Oh no, an evil robot has taken over your ${keyword}. 
This means that it was posted, but not by you, because we haven't identified you yet.
You can avoid this in the future by sending me (<@Foretold>) a private message like:
        identify me as [your foretold bot token here]
        E.g.: identify me as 007
You can find or create a foretold bot token by going to foretold.io -> My Bots.
You may later undo this process by sending me the message "forget me"
`;
  /*
  You may also use your temporary foretold token, which you may find by going to foretold.io -> right-click -> inspect -> console -> writting localStorage.getItem("server_jwt"), and using that token.
        - This allows you to access your private communities
        - However, this is considered a fragile approach, and the token produced will only last up to 3 days.
        - And when it fails, it will fail silently. 
  */

  return msg;
}
exports.an_evil_robot_has_taken_over_your = an_evil_robot_has_taken_over_your;

/* Breaks a string into a numerical_input and a comment*/
const regComment = /(.+)(?:;|\n)(?:\s)*(.+)/

function get_numerical_input_and_comment(string){

  let result = {
    numerical_input: "",
    comment: ""
  }
  
  let outputRegComment = string.match(regComment)
  
  if(outputRegComment!=null){
    
    result.numerical_input = outputRegComment[1].replace("update ", "")
    result.comment = outputRegComment[2]
    return result  
  
  }else{
  
    result.numerical_input=string.replace("update ", "")
    return result
  }
}
exports.get_numerical_input_and_comment = get_numerical_input_and_comment;

/* Helper function for extracting a question id from a url in a slack message */
const REGEX_CHANNEL = /(c\/)(.+)\/m/;
const REGEX_QUESTION_ID = /\/m(.+)/;

const qID_from_data = data => {
  let string = data.messages[0].text;
  var match = REGEX_QUESTION_ID.exec(string)[0];
  let questionId = match.slice(3, match.length - 1);

  return questionId;
};
exports.qID_from_data = qID_from_data