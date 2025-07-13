const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new Schema({
  username: { type: String, unique: true, required: true }, 
  email: { type: String, unique: true },

  skillsTeach: [String],
  skillsLearn: [String],

  sentRequests: [{ type: Schema.Types.ObjectId, ref: 'User' }],// it it tells to store object unique id from users collection
  receivedRequests: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  matches: [{ type: Schema.Types.ObjectId, ref: 'User' }],
});

userSchema.plugin(passportLocalMongoose); 

module.exports = mongoose.model('User', userSchema);
