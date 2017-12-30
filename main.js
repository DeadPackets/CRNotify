//Config
const config = require('./config.json');

//HTTP Server
const express = require('express');
const app = express();

//HTTP Logger
const morgan = require('morgan');
app.use(morgan('dev'));

//POST request parser
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: false}))

//DB
const initDB = require('./lib/initDB')
const db = initDB()

//Auth
const passport = require('passport');
const expressSession = require('express-session');
const cookieParser = require('cookie-parser')
const SequelizeStore = require('connect-session-sequelize')(expressSession.Store);
const GoogleStrategy = require('passport-google-oauth20').Strategy;

app.use(cookieParser())
app.use(expressSession({
  secret: config.webserver.cookieSecret,
  httpOnly: true,
  store: new SequelizeStore({db: db.sequelize}),
  proxy: true,
  resave: false,
  saveUninitialized: true,
  name: 'session'
}));

app.use(passport.initialize());
app.use(passport.session());

//Functions
const sendEmail = require('./lib/sendEmail');

//Middleware
const flash = require('connect-flash');
app.use(flash());

//Some optimizations
app.disable('x-powered-by')
app.disable('etag')

//Auth HTTP
app.get('/oauth', passport.authenticate('google', {
  scope: ['profile', 'email']
}))

app.get('/oauth/callback', passport.authenticate('google', {
  successRedirect: '/app',
  failureRedirect: '/'
}))

app.get('/logout', function(req, res) {
  req.logout()
  res.redirect('/')
})

//HTTP
app.get('/', function(req, res) {
  res.send('Who cares?')
})

//HTTP Server init
app.listen(config.webserver.HTTP_PORT)
