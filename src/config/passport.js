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
          const email = (profile.emails && profile.emails[0] ? profile.emails[0].value : profile._json?.email) || null;
          const name = profile.displayName || profile._json?.name || [profile.name?.givenName, profile.name?.familyName].filter(Boolean).join(' ') || (email ? email.split('@')[0] : 'User');
          const picture = (profile.photos && profile.photos[0] ? profile.photos[0].value : profile._json?.picture) || null;

          const user = {
            googleId: profile.id,
            email: email ? email.toLowerCase().trim() : null,
            name,
            picture,
          };
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
};
