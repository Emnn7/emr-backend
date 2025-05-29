const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Doctor = require('../models/Doctor');
const LabAssistant = require('../models/LabAssistant');
const Receptionist = require('../models/Receptionist');

// Local strategy for username/password login
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email, password, done) => {
      try {
        // Check in all user types
        let user = await User.findOne({ email });
        if (!user) user = await Admin.findOne({ email });
        if (!user) user = await Doctor.findOne({ email });
        if (!user) user = await LabAssistant.findOne({ email });
        if (!user) user = await Receptionist.findOne({ email });

        if (!user) {
          return done(null, false, { message: 'Incorrect email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: 'Incorrect email or password' });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// JWT strategy for token authentication
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      let user;
      switch (payload.role) {
        case 'admin':
          user = await Admin.findById(payload.id);
          break;
        case 'doctor':
          user = await Doctor.findById(payload.id);
          break;
        case 'labAssistant':
          user = await LabAssistant.findById(payload.id);
          break;
        case 'receptionist':
          user = await Receptionist.findById(payload.id);
          break;
        case 'user':
          user = await User.findById(payload.id);
          break;
        default:
          return done(null, false);
      }

      if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    } catch (err) {
      return done(err, false);
    }
  })
);

module.exports = passport;