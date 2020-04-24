var mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: {type: String, required: true},
  breadRecieved: {type: Number, default: 0},
  breadToGive: {type: Number, default: 5},
  isLeader: Boolean
});

class Database {
  constructor(){
    this.conn =  mongoose.createConnection(
      process.env.MONGODB_URI, { poolSize: 10, useNewUrlParser: true, useUnifiedTopology: true }, function(err, res){
         if (err) {
          console.log(`Error connecting to database: ${err}`);
      } else {
         console.log(`Connected to database successfully.`)
      }
    });
    this.User = this.conn.model('User', userSchema, 'users');
  }

  // Return true if database is empty. Otherwise, return false.
  isEmpty = async () => {
    let count = await this.User.count().exec();
    if ( count == 0) {
      return true;
    } else {
      return false;
    }
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
  

    // form users to schema
    let users = realUsers.map(
      (user)=> {
        return {
          id: user['id'],
          breadRecieved: 0,
          breadToGive: 5,
          isLeader: false
      }});

      this.User.create(users, function(err, docs) {
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
  updateUser = async (userId, updatedProperties) => {
    let result = await this.User.findOneAndUpdate({id: userId}, updatedProperties, {new: true}).exec();   
    return result;
  };

   // Update All Users
   updateAllUsers = async (updatedProperties) => {
    let result = await this.User.findAndUpdate({}, updatedProperties, {new: true}).exec();   
    return result;
  };

  // Get the user information
  getUser = async (userId) => {
    let user = await this.User.findOne({id: userId}).exec();
    return user;
  };

  // Get all the users information
  getUsers = async() => {
    let users = await this.User.find({}).sort({breadRecieved: -1}).select({_id: 0, __v: 0}).exec();
    return users;
  };

  // test function for my sanity
  test(){
    console.debug(`This test method words`);
  };

};


module.exports = new Database();
