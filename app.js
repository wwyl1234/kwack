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



populateDatabase = () => {
  let result = usersPromise.then(async function(res) {
    console.debug(res);
    // here use the result of users.list 
    let usersList = res['members'];
    database.populate(usersList)
    .then(
      (res) => {
        console.log('debug:', res);
      }
    );
    });
}

// Says hello when app home is opened
app.event('app_home_opened', async ({ event, say }) => {  
    database.test();


    
    //const statePromise = database.isEmpty();
    //statePromise.then(function(res) {
     // console.log(`DB is empty?:`, res);
    //})

    await say(`Hello <@${event.user}>!`);
});

// Listens to incoming messages that contain ":bread:"
app.message(/.*:bread:.*/, async ({ message, say }) => {
  console.debug('message text:',message.text);
  let giver = message.user;
  let receivers = [];
  let messageUserIds = [];
  try {
    // Parse for <@{userid}> and check if currentUser is in the message as well
    let regex = /<@(\w+)>/g
    let match = regex.exec(message.text);
    while (match != null) {
      messageUserIds.push(match[1]);
      match = regex.exec(message.text);
    }
    console.debug('messageUserIds:', messageUserIds);

    
    // TODO add logic to prevent user from giving out more bread than they have 
    // TODO add logic to prevent user from giving themselves bread

    console.debug(messageUserIds);

    
    let result = usersPromise.then(async function(res) {
      //console.debug(res);
      // here use the result of users.list 
      let userList = res['members'];
      // figure out if username is actually a user 
      messageUserIds.forEach(function (userid){
        console.debug('userid:', userid);
        if (isUser(userid, userList)){
          receivers.push(userid);
        }
      });

      console.debug('receivers', receivers);
      if (receivers.length == 0){
        await say(`<@${giver}> wants to give bread to someone!`);
      } else {
        let resultMessage = `<@${giver}> attempts to give bread to someone!\n`;
        receivers.forEach( function(userId) {
          // TODO deal with DB 
         
          resultMessage += `<@${userId}> got bread from <@${giver}>!\n`;
         }
        )
        await say(resultMessage);
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


// Listens to incoming messages from app mention 
app.event('app_mention', async ({event, say }) => {
  console.debug('DEBUG:@kwack');
  if (event.text.includes('leaderboard') ){
    console.debug('DEBUG:@kwack leaderboard');
    let dbUsers = database.getUsers();
    dbUsers.then(function(res) {
      let newMessage= '';
      console.log(`DB users: ${res}`);
      console.log(`length: ${res.length}`);
      console.log(`type: ${typeof res}`);
      for (let user in res){
        newMessage += `<@${user.id}> has total number of bread: ${user.breadRecieved}. \n`
      }
      say(newMessage);
    });
  }
}); 

   
// Determine if user is actually a user, given the userId
// userList is an array of user objects
isUser = (userId, userList) => {

  let foundUser = userList.filter(function (user){
    return user['id'] == userId && user['is_bot'] == false;
  });
  // foundUser is an array
  console.debug('foundUSer:', foundUser)
  return foundUser.length == 0 ? false : true;
}


(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);
  
 
  

  console.debug('⚡️ Bolt app is running!');
})();
