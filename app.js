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


// Listens to incoming messages that contain "hello"
app.message('hello', async ({ message, say }) => {
    console.log(message.text);
    console.log(message.user);

    // say() sends a message to the channel where the event was triggered
    await say({
        blocks: [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": `Hey there <@${message.user}>!`
            },
            "accessory": {
              "type": "button",
              "text": {
                "type": "plain_text",
                "text": "Click Me"
              },
              "action_id": "button_click"
            }
          }
        ]
      });
    });

  // Listens to incoming messages that contain ":bread:"
  app.message(':bread:', async ({ message, say }) => {
    console.log(message.text);
    let giver = message.user;
    let receivers = [];
    // Parse for <@{username}> and check if currentUser is in the message as well
    // TODO figure out if username is actually a user 

    if (receivers === []){
      await say(`<@${message.user}> wants to give bread to someone!`);
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


    
// It looks like the action method has been depreciated and shortcut method is supposed to work here.    
app.shortcut('button_click', async ({ body, ack, say }) => {
    // Acknowledge the action
    await ack();
    await say(`<@${body.user.id}> clicked the button`);
    });   


// Determine if username is a actually user
isUser = (username) => {
  // TODO use RESTAPI call https://kwackjrpraylude.slack.com/api/users.list

}


(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();
