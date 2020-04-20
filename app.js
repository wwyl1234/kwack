const { App, LogLevel} = require('@slack/bolt');

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: LogLevel.DEBUG
});

// Says hello when app home is opened
app.event('app_home_opened', ({ event, say }) => {  
    say(`Hello world, <@${event.user}>!`);
});

// Listens to incoming messages that contain "hello"
app.message('hello', async ({ message, say }) => {
    console.log(message.text);
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

  app.message(':bread:', async ({ message, say }) => {
    console.log(message.text);
    await say(`<@${message.user}> wants to give bread to someone!`);
  }); 

    
// It looks like the action method has been depreciated and shortcut method is supposed to work here.    
app.shortcut('button_click', async ({ body, ack, say }) => {
    // Acknowledge the action
    await ack();
    await say(`<@${body.user.id}> clicked the button`);
    });   

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();
