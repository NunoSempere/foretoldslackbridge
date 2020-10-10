/*

https://github.com/typicode/lowdb

Data is saved to db.json

*/

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('db.json')
const db = low(adapter)

// Set some defaults (required if your JSON file is empty)

db.defaults({ users: [], channels: {} })
  .write()

function getUserAtAllCosts(user_id){
  
  let result = undefined;
  let exists = (getUser(user_id) != undefined)
  if(!exists){
      result = db.get('users')
        .push({ user_id: user_id, user_foretold_token: process.env.FORETOLD_TOKEN })
        .write()
      console.log(result)
  }
  
  // If the above is still not possible, return the default user
  result = getUser(user_id)
  if(result==undefined){
    return getUser("default");
  }else{
    return result;
  }
  
}
exports.getUserAtAllCosts = getUserAtAllCosts

function getUser(user_id){
  let result = db.get('users')
    .find({user_id: user_id})
    .value()
  
  console.log(result)
  return result
}
exports.getUser = getUser


function getUserVariable(user_id, variable){
  let result = db.get('users')
    .find({user_id: user_id})
    .get(variable)
    .value()
  
  console.log(result)
  if(result == undefined){
    result = db.get('users')
    .find({user_id: "default"})
    .get(variable)
    .value()    
  }
  return result
}
exports.getUserVariable = getUserVariable

function setUserVariable(user_id, variable, value){
  let result = db.get('users')
    .find({user_id: user_id})
    //.assign({ variable: value})
    .set(variable, value)
    .write()
  
  console.log(result)
  return result
}
exports.setUserVariable = setUserVariable

// Tests

/*
console.log(1)
getUserAtAllCosts("ABCD")
console.log(2)
getUser("ABCD")
console.log(3)
getUser("3")
console.log(4)
setUserVariable("ABCD", "user_foretold_token", 2)
console.log(5)
getUserVariable("ABCD", "user_foretold_token")
console.log(6)
getUserVariable("3", "user_foretold_token")
*/

/* Channels */

function getChannelAtAllCosts(channel_id){
  
  let result = undefined;
  let exists = (getChannel(channel_id) != undefined)
  if(!exists){
      result = db.get('channels')
        .push({ channel_id: channel_id, counter: 0 })
        .write()
      console.log(result)
  }
  
  // If the above is still not possible, return the default channel
  result = getChannel(channel_id)
  if(result==undefined){
    return getChannel("default");
  }else{
    return result;
  }
  
}
exports.getChannelAtAllCosts = getChannelAtAllCosts

function getChannel(channel_id){
  let result = db.get('channels')
    .find({channel_id: channel_id})
    .value()
  
  console.log(result)
  return result
}
exports.getChannel = getChannel


function getChannelVariable(channel_id, variable){
  let result = db.get('channels')
    .find({channel_id: channel_id})
    .get(variable)
    .value()
  
  console.log(result)
  if(result == undefined){
    result = db.get('channels')
    .find({channel_id: "default"})
    .get(variable)
    .value()    
  }
  return result
}
exports.getChannelVariable = getChannelVariable

function setChannelVariable(channel_id, variable, value){
  let result = db.get('channels')
    .find({channel_id: channel_id})
    //.assign({ variable: value})
    .set(variable, value)
    .write()
  
  console.log(result)
  return result
}
exports.setChannelVariable = setChannelVariable

function channelIncreaseCounter(channel_id){
  let result = db.get('channels')
    .find({channel_id: channel_id})
    //.assign({ variable: value})
    .update('counter', n => n + 1)
    .write()
  
  console.log(result)
  return result
  
}
exports.channelIncreaseCounter = channelIncreaseCounter
