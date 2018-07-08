'use strict';

import superagent from 'superagent';
import bcrypt from 'bcrypt';
import User from '../model';

// This is currently setup for Google, but we could easily swap it out
// for any other provider or even use a totally different module to
// to do this work.
//
// So long as the method is called "authorize" and we get the request,
// we should be able to roll on our own here...

const authorize = (req) => {

  let tempToken = req.query.oauth_token;

  console.log('(1) tempToken', tempToken);
  let secondUrl = 'https://sandbox.evernote.com/OAuth.action?oauth_token=' + tempToken;
  return superagent.get(secondUrl)
    .then( response => {
      let oAuthVerifier = response.body.oauth_verifier;
      console.log('(2) oAuthVerifier',oAuthVerifier);
      return oAuthVerifier;
    })
  // use the token to get a user
    .then ( verifier => {
      let evernoteURL = 'https://sandbox.evernote.com/oauth';
      let date = new Date;
      let timestamp = date.getTime();
      let options = {
        oauth_consumer_key: process.env.EVERNOTE_CONSUMER_KEY,
        oauth_token: tempToken,
        oauth_verifier: verifier,
        oauth_nonce: timestamp,
        oauth_signature: 'xCYjTiyz7GZiElg1uQaHGQ6I',
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: timestamp,
        oauth_version: '2.0',
      };

      let QueryString = Object.keys(options).map((key, i) => {
        return `${key}=` + encodeURIComponent(options[key]);
      }).join('&');

      let authURL = `${evernoteURL}?${QueryString}`;

      return superagent.get(authURL)
        .then (response => {
          let user = response.body;
          console.log('(3) Evernote User', user);
          return user;
        });
    })
    .then(evernoteUser => {
      console.log('(4) Creating Account');
      return User.createFromOAuth(evernoteUser);
    })
    .then (user => {
      console.log('(5) Created User, generating token');
      return user.generateToken();
    })
    .catch(error=>error);
};
  // exchange the code or a token
//   return superagent.post('https://www.googleapis.com/oauth2/v4/token')
//     .type('form')
//     .send({
//       code: code,
//       client_id: process.env.GOOGLE_CLIENT_ID,
//       client_secret: process.env.GOOGLE_CLIENT_SECRET,
//       redirect_uri: `${process.env.API_URL}/oauth`,
//       grant_type: 'authorization_code',
//     })
//     .then( response => {
//       let googleToken = response.body.access_token;
//       console.log('(2) google token', googleToken);
//       return googleToken;
//     })
//   // use the token to get a user
//     .then ( token => {
//       return superagent.get('https://www.googleapis.com/plus/v1/people/me/openIdConnect')
//         .set('Authorization', `Bearer ${token}`)
//         .then (response => {
//           let user = response.body;
//           console.log('(3) Google User', user);
//           return user;
//         });
//     })
//     .then(googleUser => {
//       console.log('(4) Creating Account')
//       return User.createFromOAuth(googleUser);
//     })
//     .then (user => {
//       console.log('(5) Created User, generating token');
//       return user.generateToken();
//     })
//     .catch(error=>error);
// };



export default {authorize};
