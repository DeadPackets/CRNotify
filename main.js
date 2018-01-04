//Config
const config = require('./config.json');

//Lib
const checkCRN = require('./lib/checkCRN')
const getUserCRNs = require('./lib/getUserCRNs')
const removeCRN = require('./lib/removeCRN')
const changeSettings = require('./lib/changeSettings')
const sendWelcomeEmail = require('./lib/sendWelcomeEmail')

//Tor stuff
const TorControl = require('tor-control');
const control = new TorControl({password: '', persistent: true});

//DB
const initDB = require('./lib/initDB')
const db = initDB()

//HTTP Server
const express = require('express');
const app = express();

//Handlebars
const exphbs = require('express-handlebars');
app.engine('handlebars', exphbs({
  defaultLayout: 'main',
  helpers: {
    errorMessages: function(item) {
      let final = ''
      item.forEach(function(msg, i) {
        final = `<center><div class="alert alert-danger alert-dismissible fade show" role="alert">${msg}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span></button></div></center>`
      })
      return final;
    },
    successMessages: function(item) {
      let final = ''
      item.forEach(function(msg, i) {
        final = `<center><div class="alert alert-success alert-dismissible fade show" role="alert">${msg}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span></button></div></center>`
      })
      return final;
    },
    crnList: function(item) {
      let final = ''

      item.forEach(function(crn, i) {
        final = final + `<div class="card" style="width: 18rem;">
  <div class="card-body">
    <h5 class="card-title">${crn.crn} [${crn.className}]</h5>
    <h6 class="card-subtitle mb-2 text-muted">${crn.name}</h6>
    <p class="card-text">This class is currently ${crn.state.toUpperCase()}</p>
    <form action="/app/removeCRN" method="post">
        <button type="submit" class="btn btn-danger" name="crn" value="${crn.crn}">Remove</button>
    </form>
  </div>
</div>`
      })

      return final;
    }
  }
}));

app.set('view engine', 'handlebars');

//HTTP Logger
const morgan = require('morgan');
app.use(morgan('short'));

//Cookies
const expressSession = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(expressSession.Store);
const cookieParser = require('cookie-parser')

app.use(expressSession({
  secret: config.webserver.cookieSecret, httpOnly: true, proxy: true, maxAge: 7200000, //2 hours
  resave: false,
  store: new SequelizeStore({db: db.sequelize}),
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
app.enable('trust proxy');
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
        sendWelcomeEmail(user.dataValues)
        return done(null, user.dataValues)
      })
    }
  })
}))

//Auth HTTP
function isLoggedIn(req, res, next) {
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
  successRedirect: '/app/dashboard',
  failureRedirect: '/',
  failureFlash: true
}))

//HTTP
app.get('/', function(req, res) {
  if (req.isAuthenticated()) {
    res.redirect('/app')
  } else {
    res.render('home', {
      path: 'Welcome',
      error_messages: req.flash('error_message'),
      success_messages: req.flash('success_message')
    })
  }
})

//General stuff
app.get('/faq', function(req, res) {
  res.render('faq', {path: "FAQ"})
})

app.get('/stats', function(req, res) {
  res.send('soon')
})

//Anything under /app must only be accessed by a user who is logged in
app.use('/app', isLoggedIn)

app.get('/app', function(req, res) {
  res.redirect('/app/dashboard')
})

app.get('/app/dashboard', function(req, res) {
  res.render('dashboard', {
    user: req.user,
    error_messages: req.flash('error_message'),
    success_messages: req.flash('success_message'),
    path: 'Dashboard'
  })
  //res.send(req.user)
})

app.get('/app/manage', function(req, res) {

  //Fetch the user's subscribed CRNs
  getUserCRNs(req.user, db, function(err, data) {
    res.render('manage', {
      path: 'Manage',
      error_messages: req.flash('error_message'),
      success_messages: req.flash('success_message'),
      user: req.user,
      crnData: data
    })
  })
})

app.get('/app/settings', function(req, res) {
  res.render('settings', {
    path: 'Settings',
    error_messages: req.flash('error_message'),
    success_messages: req.flash('success_message'),
    settingsData: req.user
  })
})

app.get('/app/logout', function(req, res) {
  req.logout()
  req.session.destroy();
  res.render('logout', {path: 'Logged Out'})
})

//API
app.post('/app/addcrn', function(req, res) {
  if (!req.body) {
    res.redirect('/error_400')
  }

  if (req.body.crn && req.body.currentStatus) {
    checkCRN(req.body.crn, req.body.currentStatus, req.user, db, function(err, isNew) {
      if (err) {
        req.flash('error_message', err)
        res.redirect('/app/manage')
      } else {

        //Because why not?
        if (isNew) {
          req.flash('success_message', 'Successfully added new CRN!')
        } else {
          req.flash('success_message', 'Successfully added CRN!')
        }

        res.redirect('/app/manage')
      }
    })
  } else {
    res.redirect('/error_400')
  }
})

app.post('/app/removecrn', function(req, res) {
  if (!req.body) {
    res.redirect('/error_400')
  }

  if (req.body.crn) {
    removeCRN(req.body.crn, req.user, db, function(err) {
      if (err) {
        req.flash('error_message', err)
        res.redirect('/app/manage')
      } else {
        req.flash('success_message', 'Successfully removed CRN.')
        res.redirect('/app/manage')
      }
    })
  } else {
    res.redirect('/error_400')
  }
})

app.post('/app/changeSettings', function(req, res) {
  if (!req.body) {
    res.redirect('/error_400')
  }

  if (req.body.ifttt_key && req.body.ifttt_enabled) {
    changeSettings(req.body, req.user, db, function(err) {
      if (err) {
        req.flash('error_message', err)
        res.redirect('/app/settings')
      } else {
        req.flash('success_message', 'Successfully changed settings. Try sending a test notification.')
        res.redirect('/app/settingss')
      }
    })
  } else {
    res.redirect('/error_400')
  }
})

//Error 400
app.get('/error_400', function(req, res) {
  res.status(400).render('error_400', {path: 'Error'})
})

//404
app.use(function(req, res) {
  res.render('error_404', {
    url: req.url,
    path: 'Not Found'
  })
})

//HTTP Server init
app.listen(config.webserver.HTTP_PORT, 'localhost')

//WHERE THE MAGIC HAPPENS
const crawlCRNS = require('./lib/crawlCRNS')

setInterval(function() {
  crawlCRNS(db)
}, config.misc.scrapeDelay)

//Change Tor every 15 minutes
setInterval(function() {
  control.signalNewnym(function(err, status) {
    if (err) {
      console.log(err)
    }
    console.log('Changed IP.');
  });
}, 120000)
