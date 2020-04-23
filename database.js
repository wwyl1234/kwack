var mongoose = require('mongoose');
let User = require('./model/user');

class Database {
  constructor(){
    this._connect();
  }

  _connect = () => {
    mongoose.createConnection(process.env.MONGODB_URI, { poolSize: 10 }, function(error, res){
      if (err) {
        console.log(`Error connecting to database: ${err}`);
      } else {
        console.log(`Connected to database successfully.`)
      }
    });
  };

  // Return true if database is empty. Otherwise, return false.
  isEmpty = () => {
    mongoose.connection.db.collection('users').count(function(err, count) {
      if( count == 0) {
          return true;
      }
      else {
         return false;
      }
    });
  }

  // Populate the database given the userlist. Assumes database is empty. Does not assign leaders here.
  populate = (usersList) => {
    if (!this.isEmpty){
      console.log('Database is not empty. Abort populating database.');
      return;
    }

    // parse through usersList and only add actual user
    let realUsers = usersList.filter(function (user){
      return user['is_bot'] == false;
    });

    // form users to schema
    let users = realUsers.map(
      (user)=> {
        return {
          id: user['id'],
          breadRecieved: 0,
          breadToGive: 5,
          isLeader: false
      }});

    User.collection.insertMany(users, function(err, docs) {
      if (err) {
        console.error('Error has occured when inserting into database:' + err);
      } else {
        console.log(`${docs.length} users were successfully added.`);
      }
    });
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

  // test function for my sanity
  test(){
    console.debug(`This test method words`);
  };

};


module.exports = new Database();
