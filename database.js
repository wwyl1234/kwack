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
    let isEmptyPromise = await this.isEmpty();
    isEmptyPromise.then(async (res) => {
      console.log(res);
      if (!res) {
        console.log('Database is not empty. Abort populating database.');
        return;
      } else {
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
          let result = await this.User.create(users).exec() 
          return result;
        }
    });
  }

  // Determine if user is actually a user, given the userId
  // userList is an array of user objects from the slack API
  isUser = (userId, userList) => {
    let foundUser = userList.filter(function (user){
      return user['id'] == userId && user['is_bot'] == false;
    });
    // foundUser is an array
    return foundUser.length == 0 ? false : true;
  }

  // Add User 
  addUser = async (userId) => {
    let user = {
      id: userId,
      breadRecieved: 0,
      breadToGive: 5,
      isLeader: false
    };

    let existingUser = await this.User.findOne({id: userId}).exec();
    if (!existingUser){
      let result = await this.User.create(user).exec();
      console.log('Creating User.')
      return result;
    } else {
      console.log(`User already exists in database: ${userId}`)
      return existingUser;
    }
  };

  // Remove User
  removeUser = async (userId) => {
    let result = await this.User.remove({id: userId}).exec();
    return result;
  };

  // Update User
  updateUser = async (userId, updatedProperties) => {
    let result = await this.User.findOneAndUpdate({id: userId}, updatedProperties, {new: true}).exec();   
    return result;
  };

   // Update All Users
   updateAllUsers = async (updatedProperties) => {
    let result = await this.User.updateMany({}, updatedProperties, {new: true}).exec();   
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
