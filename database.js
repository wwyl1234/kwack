var mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
  id: {type: String, required: true},
  breadRecieved: {type: Number, default: 0},
  breadToGive: {type: Number, default: 5},
  isLeader: Boolean
});

class Database {
  constructor(){
    this.conn =  mongoose.createConnection(process.env.MONGODB_URI, { poolSize: 10, useNewUrlParser: true  }, function(err, res){
         if (err) {
          console.log(`Error connecting to database: ${err}`);
      } else {
         console.log(`Connected to database successfully.`)
      }
    });
    this.User = this.conn.model('User', userSchema, 'users');
  }

  //_connect = async () => {
  //  var db = mongoose.createConnection(process.env.MONGODB_URI, { poolSize: 10, useNewUrlParser: true  }, function(err, res){
  //    if (err) {
  //      console.log(`Error connecting to database: ${err}`);
  //    } else {
   //     console.log(`Connected to database successfully.`)
  //    }
  //  });
 // };

  // Return true if database is empty. Otherwise, return false.
  isEmpty = async () => {
    await this.User.count(function(err, count) {
      if(err) {
        console.error(err);
        return;
      }
      if( count == 0) {
          return true;
      }
      else {
         return false;
      }
    });
  }

  // Populate the database given the userlist. Assumes database is empty. Does not assign leaders here.
  populate = async (usersList) => {
    //if (!this.isEmpty()){
    //  console.log('Database is not empty. Abort populating database.');
     // return;
    //}
    console.debug(usersList);

    // parse through usersList and only add actual user
    let realUsers = usersList.filter(function (user){
      return user['is_bot'] == false;
    });
    console.debug(realUsers);

    // form users to schema
    let users = realUsers.map(
      (user)=> {
        return {
          id: user['id'],
          breadRecieved: 0,
          breadToGive: 5,
          isLeader: false
      }});

      console.debug(users);

      this.User.create(users, function(err, docs) {
      if (err) {
        console.error('Error has occured when inserting into database:' + err);
      } else {
        console.log(`${docs.length} users were successfully added.`);
        return docs;
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

  // Add User
  addUser = (userId, done) => {
    let user = new this.User({
      id: userId,
      breadRecieved: 0,
      breadToGive: 5,
      isLeader: false
    });
    user.save((err, data) => {
      if (err) {
        return console.error(err);
      }
      done(null, data);
    });
  };

  // Remove User
  removeUser = (userId, done) => {
    this.User.remove({id: userId}, (err, data) => {
      if (err) {
        return console.error(err);
      }
      done(null, data);
    })
  };

  // Update User
  updateUser = (userId, updatedProperties, done) => {
    this.User.findOneAndUpdate({id: userId}, updatedProperties, {new: true}, function(err, data){
      if (err) {
        return console.error(err);
      }
      done(null, data);
      }     
    )
  };

  // Give item to another user where itemName is name of the item and giver and receiver are user IDs.
  //only deal with bread 
  giveBread(giver, receiver){
    // Check if Giver has enough item
    this.User.findOne({id: giver},`BreadToGive`, function(err, user){
      if (err) {
        return console.error(err);
      } 
      // Note: Not checking if receiver exists
      if (user[`BreadToGive`] > 0 ){
        this.User.findOneAndUpdate({id: giver}, {$inc : { breadToGive: -1} }, {new: true} , (err, res) => {
          if (err) {
            console.error(err);
          } else {
            console.log(`Successfully updated.`);
          }
        });
        this.User.findOneAndUpdate({id: receiver}, {$inc : { breadRecieved: 1} }, {new: true} , (err, res) => {
          if (err) {
            console.error(err);
          } else {
            console.log(`Successfully updated.`);
          }
        });
      } else {
        console.log(`Fail to give Bread.`);
      }
    })
  }

  // Get the user information
  getUser(userId){
    this.User.findOne({id: userId}, (err, user) => {
      if (err){
        console.error(err);
      } else {
        return user;
      }
    })
  };

  // Get all the users information
  getUsers = async() => {
    await this.User.find({}, (err, users) => {
      if (err){
        console.error(err);
        return;
      } else {
        return users;
      }
    })
  };

  // test function for my sanity
  test(){
    console.debug(`This test method words`);
  };

};


module.exports = new Database();
