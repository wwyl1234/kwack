const {App} = require('@slack/bolt');
const database = require('./database');

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const usersPromise = app.client.users.list({
  token: process.env.SLACK_BOT_TOKEN
});

// This needs to be before TIMERID or be part of the definition
// Update All Users at the given hour and given minute (GMT -4)
updateAllUsers = (hour, minute) => {
  // Based on local Canada time
  let date = new Date().toLocaleString('en-CA', {hour12: false, timeZone: 'America/Toronto'});
  let dateArray = date.split(',');
  let timeArray = dateArray[1].split (':');
  if (timeArray[0] == hour && timeArray[1] == minute) {
    console.log(date, 'update has been called');
    database.updateAllUsers({breadToGive: 5})
      .then((res) => console.log(res));
  }
}

const TIMERID = setInterval(updateAllUsers, 60000, 9, 42);

const HELPMSG =`
To get help, type: '@kwack help' \n
To give bread to another user, type:  ':bread: <username>'\n
To see the leaderboard, type: '@kwack leaderboard' \n
To get info about yourself, type: '@kwack info' \n
`

populateDatabase = () => {
  let result = usersPromise.then(async function(res) {
    console.debug(res);
    // here use the result of users.list 
    let usersList = res['members'];
    database.populate(usersList)
    .then((res) => console.log(res));
    });
}

// Says hello when app home is opened
app.event('app_home_opened', async ({ event, say }) => {  
    await say(`Hello <@${event.user}>!`);
});

// Listens to incoming messages that contain ":bread:"
app.message(/.*:bread:.*/, async ({ message, say }) => {
  let giver = message.user;
  let receivers = [];
  let messageUserIds = [];
  try {
    // Parse for <@{userid}> and check if currentUser is in the message as well
    let regex = /<@(\w+)>/g
    let match = regex.exec(message.text);
    let mentionSelf = false;
    while (match != null) {
      let userId = match[1]
      if (userId == giver){
        mentionSelf = true;
      }
      messageUserIds.push(userId);
      match = regex.exec(message.text);
    }

    // to prevent user from giving themselves bread
    if (mentionSelf === true){
      await say(`Stop trying to cheat the system. You cannot give bread to yourself!`)
      return;
    } 
    let result = usersPromise.then(async function(res) {
      let userList = res['members'];
      // figure out if username is actually a user 
      messageUserIds.forEach(function (userid){
        if (isUser(userid, userList)){
          receivers.push(userid);
        }
      });

      if (receivers.length == 0){
        await say(`<@${giver}> wants to give bread to someone!`);
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
              database.updateUser(userId, {$inc: {breadRecieved: 1}})
                .then((res) => console.log(res));
              resultMessage += `<@${userId}> got bread from <@${giver}>!\n`;
              });
            }
          await say(resultMessage);
        })
      }
    });
     
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


// Listens to incoming messages from app mention event
app.event('app_mention', async ({event, say }) => {
  if (event.text.includes('leaderboard') ){
    let dbUsers = database.getUsers();
    dbUsers.then(function(res) {
      let newMessage= '';
      for (let i = 0; i < res.length; i++){
        let user = res[i];
        console.log(user, user['id'], user['breadRecieved']);
        newMessage += `<@${user['id']}> has total number of bread: ${user['breadRecieved']}. \n`
      }
      say(newMessage);
    });
  }
  if (event.text.includes('help') ){
    await say(HELPMSG);
  }
  if (event.text.includes('info')){
    database.getUser(event.user)
      .then(async (res) => {
        let message = `You have ${res.breadToGive} bread left to give and have recieved ${res.breadRecieved} bread!`;
        await say(message);
      } 
    );
  }
}); 

// Determine if user is actually a user, given the userId
// userList is an array of user objects
isUser = (userId, userList) => {

  let foundUser = userList.filter(function (user){
    return user['id'] == userId && user['is_bot'] == false;
  });
  // foundUser is an array
  return foundUser.length == 0 ? false : true;
}


(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);
  console.debug('⚡️ Bolt app is running!');
})();
