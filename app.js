const { App, LogLevel} = require('@slack/bolt');

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: LogLevel.DEBUG
});

// Says hello when app home is opened
app.event('app_home_opened', ({ event, say }) => {  
    say(`Hello <@${event.user}>!`);
});

// Listens to incoming messages that contain ":bread:"
app.message(':bread:', async ({ message, say }) => {
  console.debug(message.text);
  let giver = message.user;
  let receivers = [];
  let messageUserIds = [];

  try {
    // Parse for <@{userid}> and check if currentUser is in the message as well
    let regex = /<@([A-z]+)>/g
    let match = regex.exec(message.text);
    while (match != null) {
      messageUserIds.push(match[1]);
      match = regex.exec(message.text);
    }
    console.debug(messageUserIds);

    const usersPromise = app.client.users.list({
      token: SLACK_BOT_TOKEN
    });
    let result = usersPromise.then(function(res) {
      return res;
    });

    console.debug('usersPromise:', usersPromise);
    console.debug('result:',result);
    let userList = result['members'];
     // figure out if username is actually a user 
     messageUserIds.forEach(function (userid){
      let potentialUser = getUser(userid, userList);
      if (potentialUser.length !== 0){
        // There should be only one potential user
        receivers.push(potentialUser[0]);
      }
    });
    console.debug(receivers);
    // TODO add logic to prevent user from giving out more bread than they have 
    // TODO add logic to prevent user from giving themselves bread

    if (receivers == []){
      await say(`<@${giver}> wants to give bread to someone!`);
    } else {
      let resultMessage = `<@${giver}> attempts to give bread to someone!`;
      receivers.forEach( function(user) {
        // TODO deal with DB 
        let userId = user['id'];
        resultMessage += `$<@${userId}> got bread from <@${giver}>!\n`;
       }
      )
      await say(resultMessage);
    }
  }
    catch (error) {
      console.error(error);
    }

}); 


// Listens to incoming messages that contain ":taco:"
app.message(':taco:', async ({ message, say }) => {
  let newMessage = `This is not the heytaco app...
  It's raining tacos
  From out of the sky
  Tacos
  No need to ask why
  Just open your mouth and close your eyes
  It's raining tacos.

  You can sing the rest of the song now :P!
  `
  await say(newMessage);
}); 

   
// Get the user given the userId
// userList is an array of user objects
getUser = (userId, userList) => {
  // TODO use RESTAPI call https://kwackjrpraylude.slack.com/api/users.list ?
  let foundUser = userList.filter(function (user){
    return user['id'] == userId && user['is_bot'] == false;
  });
  // foundUser is an array
  return foundUser;
}


(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.debug('⚡️ Bolt app is running!');
})();
