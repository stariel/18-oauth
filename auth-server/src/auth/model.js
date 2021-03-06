'use strict';

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema({
  username: {type: String, required: true, unique: true},
  password: {type: String, required: true},
  email: {type: String, required: true},
});

// Before we save, hash the plain text password
userSchema.pre('save', function(next) {
  bcrypt.hash(this.password,10)
    .then(hashedPassword => {
      // Update the password for this instance to the hashed version
      this.password = hashedPassword;
      // Continue on (actually do the save)
      next();
    })
    // In the event of an error, do not save, but throw it instead
    .catch( error => {throw error;} );
});

userSchema.statics.createFromOAuth = function(incoming) {


  if ( ! incoming || ! incoming.edam_userId ) {
    return Promise.reject('VALIDATION ERROR: missing userID or password ');
  }

  return this.findOne({username:incoming.edam_userId})
    .then(user => {
      if ( ! user ) { throw new Error ('User Not Found'); }
      console.log('Welcome Back', user.username);
      return user;
    })
    .catch( error => {
    // Create the user
      let username = incoming.edam.userId;
      let password = incoming.oauth_token;
      return this.create({
        username: username,
        password: password,
        email: incoming.edam_userId,
      });
    });

};

// If we got a user/password, compare them to the hashed password
// return the user instance or an error
userSchema.statics.authenticate = function(auth) {
  let query = {username:auth.username};
  return this.findOne(query)
    .then(user => user && user.comparePassword(auth.password))
    .catch(error => error);
};

userSchema.statics.authorize = function(token) {
  let parsedToken = jwt.verify(token, process.env.SECRET || 'changeit');
  let query = {_id:parsedToken.id};
  return this.findOne(query)
    .then(user => {
      // looked up their role and then all capabilities
      return user;
    })
    .catch(error => error);
};

// Compare a plain text password against the hashed one we have saved
userSchema.methods.comparePassword = function(password) {
  return bcrypt.compare(password, this.password)
    .then(valid => valid ? this : null);
};

// Generate a JWT from the user id and a secret
userSchema.methods.generateToken = function() {
  return jwt.sign( {id:this._id}, process.env.SECRET || 'changeit' );
};

export default mongoose.model('users', userSchema);
