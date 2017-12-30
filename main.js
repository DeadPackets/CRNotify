//Config
const config = require('./config.json');

//DB
const initDB = require('./lib/initDB')
const db = initDB()

//HTTP Server
const express = require('express');
const app = express();

//Handlebars
const exphbs  = require('express-handlebars');
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

//HTTP Logger
const morgan = require('morgan');
app.use(morgan('dev'));

//Cookies
const expressSession = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(expressSession.Store);
const cookieParser = require('cookie-parser')

app.use(expressSession({
  secret: config.webserver.cookieSecret,
  httpOnly: true,
  proxy: true,
  resave: false,
  saveUninitialized: true,
  name: 'session'
}));
app.use(cookieParser())

//POST request parser
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: false}))

//Static Web Files
app.use(express.static('web'))

//Auth
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

app.use(passport.initialize());
app.use(passport.session());

//Functions
const sendEmail = require('./lib/sendEmail');

//Middleware
const flash = require('connect-flash');
app.use(flash());

//Some optimizations
app.enable('view cache');
app.disable('x-powered-by')
app.disable('etag')

//Passport

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  db.Users.findById(id).then(function(user) {
    if (user) {
      done(null, user)
    } else {
      done("error", null) //Should probably never happen
    }
  })
});

passport.use(new GoogleStrategy({
  clientID: config.oauth.clientID,
  clientSecret: config.oauth.clientSecret,
  callbackURL: config.oauth.callbackURL
}, function(accessToken, refreshToken, profile, done) {
  db.Users.find({
    where: {
      googleID: profile.id
    }
  }).then(function(user) {
    //User already registered
    if (user) {
      return done(null, user)
    } else {
      //Insert new user in DB
      db.Users.create({googleID: profile.id, token: accessToken, email: profile.emails[0].value, name: profile.displayName}).then(user => {
      return done(null, user.dataValues)
      })
    }
  })
}))

//Auth HTTP
function isLoggedIn(req, res, next) {
  console.log(req.isAuthenticated())
  if (req.isAuthenticated()) {
    next()
  } else {
    req.flash("error_message", "You must be logged in to do that!")
    res.redirect('/')
  }
}

app.get('/auth', passport.authenticate('google', {
  scope: ['profile', 'email']
}))

app.get('/auth/callback', passport.authenticate('google', {
  successRedirect: '/app',
  failureRedirect: '/',
  failureFlash: true
}))

app.get('/logout', function(req, res) {
  req.logout()
  req.flash('success_message', 'You have logged out successfully.')
  res.redirect('/')
})

//HTTP
app.get('/', function(req, res) {
  if (req.isAuthenticated()) {
    res.render('home', {isLoggedIn: true})
  } else {
    res.render('home', {isLoggedIn: false})
  }
})

app.get('/app', isLoggedIn, function(req, res) {
  res.send(req.user)
})

//HTTP Server init
app.listen(config.webserver.HTTP_PORT)
