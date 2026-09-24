const GoogleStrategy = require('passport-google-oauth20').Strategy;
const config = require('./index');

module.exports = (passport) => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = {
            googleId: profile.id,
            email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
            name: profile.displayName,
            picture: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
          };
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
};
