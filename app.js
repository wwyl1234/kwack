const database = require('./database');
var express = require('express');
var restapi = express();
const bodyParser = require('body-parser')

const {createEventAdapter}   = require('@slack/events-api')
const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET)
const  {WebClient}  = require('@slack/web-api')
const webClient = new WebClient(process.env.SLACK_BOT_TOKEN)


restapi.use('/slack/events', slackEvents.expressMiddleware())

restapi.use(bodyParser.json())
restapi.use(
    bodyParser.urlencoded({
    extended: true,
  })
)

const HELPMSG =`
To get help, type: '@kwack help' \n
To give bread to another user, type:  ':bread: <username>'\n
Only leaders can give cheese to another user, by typing:  ':cheese_wedge: <username>'\n
To see the leaderboard, type: '@kwack leaderboard' \n
To get info about yourself, type: '@kwack info' \n
`

populateDatabase = async () => {
  let result = await webClient.users.list({token: process.env.SLACK_BOT_TOKEN})
  console.debug(result);
  // here use the result of users.list 
  let usersList = result['members'];
  database.populate(usersList)
    .then((res) => console.log(res));
    
}

// Use Web Client to send message back to Slack
say = (message, channel) => {
  webClient.chat.postMessage({
    text: message,
    channel: channel
  });
}

//=========================================================
// Slack Events

// Event handler for app_home_opened
// Says hello when app home is opened
slackEvents.on('app_home_opened', async (event) => { 
  console.log(event);
  try {
    let message =  `Hello <@${event.user}>!`
    console.log('app_home_opened event')
    console.log("in this channel", event.channel)
    await say(message, event.channel);
    
  } catch (e) {
    console.error(e);
  }
});

// Event handler for app_mention
slackEvents.on('app_mention', async (event) => {
  console.log(event);
  if (event.text.includes('leaderboard') ){
    let dbUsers = database.getUsers();
    dbUsers.then(function(res) {
      let newMessage= '';
      for (let i = 0; i < res.length; i++){
        let user = res[i];
        console.log(user, user['id'], user['breadReceived']);
        newMessage += `<@${user['id']}> has received ${user['breadReceived']} bread and ${user['cheeseReceived']} cheese.\n`
      }
      say(newMessage, event.channel);
    });
  }
  if (event.text.includes('help') ){
    await say(HELPMSG, event.channel);
  }
  if (event.text.includes('info')){
    database.getUser(event.user)
      .then(async (res) => {
        let message = `You have ${res.breadToGive} bread left to give and have received ${res.breadReceived} bread and ${res.cheeseReceived} cheese`;
        await say(message, event.channel);
      } 
    );
  }
}); 

//==============================================================
// Slack messages

// Listens to incoming messages
slackEvents.on('message', async (event) => {
  console.log(event)

  // Do not listen to messages that has been edited
  if (event['subtype'] =='message_changed'){
    return
  }

  // Listens to incoming mesages that contain ":bread:"
  let regex = /.*:bread:.*/;
  if (regex.test(event.text)){
    breadListener(event);
  }
  // Listens to incoming mesages that contain ":cheese_wedge:"
  if (/.*:cheese_wedge.*/.test(event.text)) {
    cheeseListener(event);
  }
  // Listens to incoming messages that contain ":taco:"
  if (event.text.includes(':taco:')){
    tacoListener(event);
  }

  // Listen to Slackbot reminder message to replenish
  if (event.text.includes('replenish') && event.user == 'USLACKBOT'){
    replenish();
  }

});

tacoListener = async (event) => {
  let newMessage = `This is not the heytaco app...
  It's raining tacos
  From out of the sky
  Tacos
  No need to ask why
  Just open your mouth and close your eyes
  It's raining tacos.

  You can sing the rest of the song now :P!
  `
  await say(newMessage, event.channel);
}

// Parse for <@{userid}>  in a text and checks if user is mentioned in text and 
// returns a JSON  containing a list of usersIds not the same as user and 
// boolean indicating if user is mentioned in text
parseUsers = (user, text) => {
  let messageUserIds = [];
  let regex = /<@(\w+)>/g
  let match = regex.exec(text);
  let mentionSelf = false;
  while (match != null) {
    let userId = match[1];
    if (userId == user){
      mentionSelf = true;
    }
    messageUserIds.push(userId);
    match = regex.exec(text);
  }
  return {
    users: messageUserIds, 
    mentionSelf: mentionSelf
  }
}

filterActualUsers = async (users) => {
  let receivers = [];
  let result =  await webClient.users.list({token: process.env.SLACK_BOT_TOKEN});
  let userList = result['members'];
  // figure out if username is actually a user 
  users.forEach(function (userid){
    if (isUser(userid, userList)){
      receivers.push(userid);
    }
  });
  return receivers;
}

breadListener =  async (event) => {
  let giver = event.user;
  
  try {
    // Parse for <@{userid}> and check if currentUser is in the message as well
    let parsedResult = parseUsers(giver, event.text);
    let mentionSelf = parsedResult['mentionSelf'];
    let messageUserIds = parsedResult['users'];

    // to prevent user from giving themselves bread
    if (mentionSelf === true){
      await say(`Stop trying to cheat the system. You cannot give bread to yourself!`, event.channel)
      return;
    } 
    filterActualUsers(messageUserIds)
      .then( async (receivers) => {
        if (receivers.length == 0){
          await say(`<@${giver}> wants to give bread to someone!`, event.channel);
        } else {
          let resultMessage = `<@${giver}> attempts to give bread to someone!\n`;
          // to prevent user from giving out more bread than they have 
          let giverData =  database.getUser(giver);
          giverData.then(async function(res){
            console.debug(`giver:`, res);
            if (res.breadToGive < receivers.length) {
              resultMessage += `<@${giver}> does not have enough bread to give.`
            } else {
              let numBread = -1 * receivers.length;
              database.updateUser(giver, {$inc: {breadToGive: numBread}})
                .then((res) => console.log(res));
              receivers.forEach(function(userId) {
                database.updateUser(userId, {$inc: {breadReceived: 1}})
                  .then((res) => console.log(res));
                resultMessage += `<@${userId}> got bread from <@${giver}>!\n`;
                });
            }
            await say(resultMessage, event.channel);
            })
        }
      })
  }
  catch (error) {
    console.error(error);
  }
}

cheeseListener =  async (event) => {
  let giver = event.user;
  try {
    // Parse for <@{userid}> and check if currentUser is in the message as well
    let parsedResult = parseUsers(giver, event.text);
    let mentionSelf = parsedResult['mentionSelf'];
    let messageUserIds = parsedResult['users'];

    // to prevent user from giving themselves cheese
    if (mentionSelf === true){
      await say(`Stop trying to cheat the system. You cannot give cheese to yourself!`, event.channel)
      return;
    } 

    console.log("parsedResult:", parsedResult)

    // only leader can give cheese
    database.isLeader(giver)
      .then(async (result) => {
        if (!result){
          await say(`Only leaders can give cheese`, event.channel)
        } else {
          filterActualUsers(messageUserIds)
            .then(async (receivers) => {
              console.log('receivers:', receivers)
              if (receivers.length == 0){
                await say(`<@${giver}> wants to give cheese to someone!`, event.channel);
              } else {
                let resultMessage = `<@${giver}> attempts to give cheese to someone!\n`;
                receivers.forEach(function(userId) {
                  database.updateUser(userId, {$inc: {cheeseReceived: 1}})
                    .then((res) => console.log(res));
                  resultMessage += `<@${userId}> got cheese from <@${giver}>!\n`;
                  });
                  await say(resultMessage, event.channel);
              }
            })
        }
      })
  } catch (error) {
    console.error(error);
  }
}

// Determine if user is actually a user, given the userId
// userList is an array of user objects
isUser = (userId, userList) => {

  let foundUser = userList.filter(function (user){
    return user['id'] == userId && user['is_bot'] == false;
  });
  // foundUser is an array
  return foundUser.length == 0 ? false : true;
}

// replenish bread to give
replenish = () => {
  database.updateAllUsers({breadToGive: 5})
    .then((result) => console.log(result));
}

// get new users from Slack and add them to db
getNewUsers = async() => {
  let newUsers = [];
  let slackUsers =  await webClient.users.list({token: process.env.SLACK_BOT_TOKEN});
  let slackUsersList = slackUsers['members'];
  // figure out if username is actually a user
  let actualUsers = slackUsersList.filter(function (user){
    return user['is_bot'] == false;
  });
 
  let dbUsers = database.getUsers();
  dbUsers.then(result => {
    // for each user in actualUsers check if it is in the db, if not add it to newUsers
    actualUsers.forEach( slackUser => {
      isUserInDB = false
      result.forEach( dbUser => {
        if (slackUser['id'] == dbUser['id']){
          isUserInDB = true;
        }
      })
      if (isUserInDB == false){
        newUsers.push(slackUser['id'])
      }
    })
    newUsers.forEach(userId => {
      database.addUser(userId)
        .then(res => console.log(res))
      })
    return newUsers;
  })
}

// ==============================================================
// code for restapi


// Get users from Slack API
restapi.get('/slack/users', async (req, res) => {
  let result = await webClient.users.list({token: process.env.SLACK_BOT_TOKEN})
  let userList = result['members'];
  res.json(userList);
})

// Get users from database
restapi.get('/db/users', (req, res) => {
  let dbUsers = database.getUsers();
  dbUsers.then(result => res.json(result));
})

// Update new users from Slack to database
restapi.post('/db/update/userslist', async (req, res) => {
  let newUsers = getNewUsers();
  newUsers.then(result => {
    res.json(result)
  });
  newUsers.catch(err => res.json(err));

})

// Get leaders from database
restapi.get('/leaders', (req, res) => {
  let dbLeaders = database.getLeaders();
  dbLeaders.then(result => res.json(result));
  // If it is empty or error occurs
  dbLeaders.catch(err => res.json(err));
})

// Set isLeader property to be true to existing userid
restapi.post('/add/leader', (req, res) => {
  let userId = req.body.user_id;
  console.log(userId)
  database.updateUser(userId, {isLeader: true})
    .then(result => {
      console.log(result);
      res.json(result)})
})


// Delete isLeader property to be false to existing userid
restapi.post('/delete/leader', (req, res) => {
  let userId = req.body.user_id;
  database.updateUser(userId, {isLeader: false})
    .then(result => res.json(result))
})

// Refresh the bread to give for all users
restapi.post('/replenish', (req, res) => {
  replenish()
})

// Reset all to defaults except for isLeader
restapi.post('/reset', (req, res) => {
  database.updateAllUsers({breadToGive: 5, breadReceived: 0, cheeseReceived: 0})
  .then((result) => res.json(result));
})

// Reset all users in the database to defaults
restapi.post('/hardreset', (req, res) => {
  database.updateAllUsers({breadToGive: 5, isLeader: false, breadReceived: 0, cheeseReceived: 0})
  .then((result) => res.json(result));
})

// For debugging and testing purposes and setting the correct bread or cheese received due to bug or any unseen circumstances

// Set bread recieved for this user
restapi.post('/set/breadReceived', (req, res) => {
  let userId = req.body.user_id;
  let breadReceived = parseInt(req.body.bread_received)
  database.updateUser(userId, {breadReceived : breadReceived})
    .then(result => {
      console.log(result);
      res.json(result)})
    .catch( err => console.log(err))
})

// Set cheese recieved for this user
restapi.post('/set/cheeseReceived', (req, res) => {
  let userId = req.body.user_id;
  let cheeseReceived = parseInt(req.body.cheese_received)
  database.updateUser(userId, {cheeseReceived : cheeseReceived })
    .then(result => {
      console.log(result);
      res.json(result)})
    .catch( err => console.log(err))
})

// REST API server is listening on the given environment port
restapi.listen(process.env.PORT , function() {
  console.log(`RESTAPI listening on port ${process.env.PORT}!`);
});