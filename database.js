var mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: {type: String, required: true},
  breadReceived: {type: Number, default: 0},
  breadToGive: {type: Number, default: 5},
  isLeader: Boolean
});

userSchema.add(
  {
    cheeseReceived: {type: Number, default: 0}
  }
)

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
              breadReceived: 0,
              breadToGive: 5,
              cheeseReceived: 0,
              isLeader: false
          }});
          let result = await this.User.create(users).exec() 
          return result;
        }
    });
  }

  // Return true is user is a leader. Otherwise return false.
  isLeader = async (userId) => {
    let user = await this.User.findOne({id: userId}).exec();
    console.debug(user);
    if (user){
      if (user['isLeader'] == true) {
        return true;
      }
      return false;
    } else {
      return false;
    }
  }

  // Add User 
  addUser = async (userId) => {
    let user = {
      id: userId,
      breadReceived: 0,
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
  getUsers = async () => {
    let users = await this.User.find({}).sort({breadReceived: -1}).select({_id: 0, __v: 0}).exec();
    return users;
  };

  // Get leaders
  getLeaders = async () => {
    let leaders = await this.User.find({isLeader: true}).sort({breadReceived: -1}).select({_id: 0, __v: 0}).exec();
    return leaders;
  }
};


module.exports = new Database();
