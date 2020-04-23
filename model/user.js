var mongoose = require('mongoose');


let userSchema = new mongoose.Schema({
    id: {type: String, required: true},
    breadRecieved: {type: Number, default: 0},
    breadToGive: {type: Number, default: 5},
    isLeader: Boolean
  });
  
  
  module.exports = mongoose.model('User', userSchema)