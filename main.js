/* eslint-disable require-jsdoc */
/* eslint-disable no-console */
/* eslint-disable no-inner-declarations */
//Config
const config = require('./config.json');

//Lib
const checkCRN = require('./lib/checkCRN');
const getUserCRNs = require('./lib/getUserCRNs');
const removeCRN = require('./lib/removeCRN');
const changeSettings = require('./lib/changeSettings');
const sendWelcomeEmail = require('./lib/sendWelcomeEmail');
const getStats = require('./lib/getStats');
const authMobile = require('./lib/authMobile');

//i like colors
const chalk = require('chalk');

//DB
const initDB = require('./lib/initDB');
const db = initDB();

//HTTP Server
const express = require('express');
const app = express();

//Socket
const http = require('http');
const server = http.createServer(app);

//Handlebars
const exphbs = require('express-handlebars');
app.engine('handlebars', exphbs({
	defaultLayout: 'main',
	helpers: {
		errorMessages: function (item) {
			let final = '';
			item.forEach((msg) => {
				final = `<center><div class="alert alert-danger alert-dismissible fade show" role="alert">${msg}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span></button></div></center>`;
			});
			return final;
		},
		successMessages: function (item) {
			let final = '';
			item.forEach((msg) => {
				final = `<center><div class="alert alert-success alert-dismissible fade show" role="alert">${msg}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span></button></div></center>`;
			});
			return final;
		},
		crnList: function (item) {
			let final = '';
			if (item.length === 0) {
				final += "<p>You aren't subscribed to any CRNs yet.</p>";
			} else {
				item.forEach((crn) => {
					final = final + `<div class="card" style="width: 18rem;">
					<div class="card-body">
						<h5 class="card-title">${crn.crn} [${crn.className}]</h5>
						<h6 class="card-subtitle mb-2 text-muted">${crn.name} ${crn.section} - ${crn.termID}</h6>
						<p class="card-text">This class is currently <b>${(crn.state === 'Y') ? "open" : "closed"}</b>.</p>
						<form action="/app/removeCRN" method="post">
							<button type="submit" class="btn btn-danger" name="crn" value="${crn.crn}">Remove</button>
						</form>
					</div>
					</div>`;
				});
			}
			return final;
		},
		json: function (item) {
			return JSON.stringify(item);
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
const sessionStore = new SequelizeStore({
	db: db.sequelize
});
const cookieParser = require('cookie-parser');
sessionStore.sync();

app.use(expressSession({
	secret: config.webserver.cookieSecret,
	httpOnly: true,
	proxy: true,
	maxAge: 7200000, //2 hours
	resave: false,
	store: sessionStore,
	saveUninitialized: true,
	name: 'session'
}));
app.use(cookieParser());


//POST request parser
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
	extended: false
}));

//Static Web Files
app.use(express.static('web'));

//Auth
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

app.use(passport.initialize());
app.use(passport.session());

//Middleware
const flash = require('connect-flash');
app.use(flash());

//Some optimizations
app.enable('view cache');
app.enable('trust proxy');
app.disable('x-powered-by');
app.disable('etag');

//Passport
passport.serializeUser((user, done) => {
	done(null, user.id);
});

passport.deserializeUser((id, done) => {
	db.Users.findByPk(id).then((user) => {
		if (user) {
			done(null, user);
		} else {
			done('error', null); //Should probably never happen
		}
	});
});

passport.use(new GoogleStrategy({
	clientID: config.oauth.clientID,
	clientSecret: config.oauth.clientSecret,
	callbackURL: config.oauth.callbackURL
}, ((accessToken, refreshToken, profile, done) => {
	db.Users.findOne({
		where: {
			googleID: profile.id
		}
	}).then((user) => {
		//User already registered
		if (user) {
			return done(null, user);
		} else {
			//Insert new user in DB
			db.Users.create({
				googleID: profile.id,
				token: accessToken,
				email: profile.emails[0].value,
				name: profile.displayName
			}).then((user) => {
				sendWelcomeEmail(user.dataValues);
				return done(null, user.dataValues);
			});
		}
	});
})));

//General stuff
app.get('/donate', (req, res) => {
	res.render('donate', {
		path: 'Donate'
	});
});

app.get('/faq', (req, res) => {
	res.render('faq', {
		path: 'FAQ'
	});
});

app.get('/stats', (req, res) => {
	getStats(db, (err, data) => {
		res.render('statistics', {
			path: 'Statistics',
			data
		});
	});
});

app.get('/', (req, res) => {
	if (config.misc.enabled) {
		if (req.isAuthenticated()) {
			res.redirect('/app');
		} else {
			res.render('home', {
				path: 'Welcome',
				error_messages: req.flash('error_message'),
				success_messages: req.flash('success_message')
			});
		}
	} else {
		res.render('home', {
			path: 'Welcome',
			error_messages: req.flash('error_message'),
			success_messages: req.flash('success_message')
		});
	}
});

//Error 400
app.get('/error_400', (req, res) => {
	res.status(400).render('error_400', {
		path: 'Error'
	});
});

app.use('/app', (req, res, next) => {
	if (config.misc.enabled) {
		next();
	} else {
		req.flash('error_message', 'I\'m sorry, but CRNotify is disabled until the next registration period');
		res.redirect('/');
	}
});

app.use('/mobile_api', (req, res, next) => {
	if (config.misc.enabled) {
		next();
	} else {
		res.json({
			success: false,
			error: 'CRNotify is disabled.'
		});
	}
});

//Auth HTTP
function isLoggedIn(req, res, next) {
	if (req.isAuthenticated()) {
		next();
	} else {
		req.flash('error_message', 'You must be logged in to do that!');
		res.redirect('/');
	}
}

function isLoggedInMobile(req, res, next) {
	if (req.query.token) {
		authMobile(req.query.token, db, (err, data) => {
			if (err) {
				res.json({
					success: false,
					error: err
				});
			} else {
				req.user = data;
				next();
			}
		});
	} else {
		res.json({
			success: false,
			error: 'Invalid Parameters.'
		});
	}
}

app.get('/auth', passport.authenticate('google', {
	scope: ['profile', 'email']
}));

function addCookie(req, res, next) {
	req.session.authType = 'mobile';
	next();
}

app.get('/auth/mobile', addCookie, passport.authenticate('google', {
	scope: [
		'profile', 'email'
	],
	callbackURL: config.oauth.callbackURL
}));

app.get('/auth/callback', passport.authenticate('google', {
	failureRedirect: '/',
	failureFlash: true
}), (req, res) => {
	if (req.session.authType === 'mobile') {
		res.redirect('CRNotify://login?user=' + JSON.stringify(req.user));
	} else {
		res.redirect('/app/dashboard');
	}
});

//Anything under /app must only be accessed by a user who is logged in
app.use('/app', isLoggedIn);
app.use('/mobile_api/', isLoggedInMobile);

app.get('/app', (req, res) => {
	res.redirect('/app/dashboard');
});

app.get('/app/dashboard', (req, res) => {
	res.render('dashboard', {
		user: req.user,
		error_messages: req.flash('error_message'),
		success_messages: req.flash('success_message'),
		path: 'Dashboard'
	});
});

app.get('/app/manage', (req, res) => {

	//Fetch the user's subscribed CRNs
	getUserCRNs(req.user, db, (err, data) => {
		res.render('manage', {
			path: 'Manage',
			error_messages: req.flash('error_message'),
			success_messages: req.flash('success_message'),
			user: req.user,
			crnData: data
		});
	});
});

app.get('/app/settings', (req, res) => {
	res.render('settings', {
		path: 'Settings',
		error_messages: req.flash('error_message'),
		success_messages: req.flash('success_message'),
		settingsData: req.user
	});
});

app.get('/app/logout', (req, res) => {
	req.logout();
	req.session.destroy();
	res.render('logout', {
		path: 'Logged Out'
	});
});

//API
app.post('/app/addcrn', (req, res) => {
	if (!req.body) {
		res.redirect('/error_400');
	}

	if (req.body.crn && req.body.semester && req.body.subject && req.body.year) {
		checkCRN(req.body, db, req.user, (err, crnInfo, isNew) => {
			if (err) {
				req.flash('error_message', err);
				res.redirect('/app/manage');
			} else {
				//Because why not?
				if (isNew) {
					console.log(chalk.green(`${req.user.email} added a new CRN! (${crnInfo.crn} - ${crnInfo.termID}) [${crnInfo.className}]`));
					req.flash('success_message', 'Successfully added new CRN!');
				} else {
					console.log(chalk.green(`${req.user.email} subscribed to a CRN! (${crnInfo.crn} - ${crnInfo.termID}) [${crnInfo.className}]!`));
					req.flash('success_message', 'Successfully added CRN!');
				}
				res.redirect('/app/manage');
			}
		});
	} else {
		res.redirect('/error_400');
	}
});

app.post('/app/removecrn', (req, res) => {
	if (!req.body) {
		res.redirect('/error_400');
	}

	if (req.body.crn) {
		removeCRN(req.body.crn, req.user, db, (err) => {
			if (err) {
				req.flash('error_message', err);
				res.redirect('/app/manage');
			} else {
				console.log(chalk.green(`${req.user.email} removed CRN ${req.body.crn}.`));
				req.flash('success_message', 'Successfully removed CRN.');
				res.redirect('/app/manage');
			}
		});
	} else {
		res.redirect('/error_400');
	}
});

app.post('/app/changeSettings', (req, res) => {
	if (!req.body) {
		res.redirect('/error_400');
	}

	if (req.body.ifttt_key && req.body.ifttt_enabled) {
		changeSettings(req.body, req.user, db, (err) => {
			if (err) {
				req.flash('error_message', err);
				res.redirect('/app/settings');
			} else {
				req.flash('success_message', 'Successfully changed settings. Try sending a test notification.');
				res.redirect('/app/settingss');
			}
		});
	} else {
		res.redirect('/error_400');
	}
});

//API
app.get('/status', (req, res) => {
	res.json({
		enabled: config.misc.enabled
	});
});

app.post('/mobile_api/getCRNs', (req, res) => {
	getUserCRNs(req.user, db, (err, data) => {
		if (err) {
			res.json({
				success: false,
				error: err
			});
		} else {
			res.json({
				success: true,
				data: data
			});
		}
	});
});

app.post('/mobile_api/removeCRN', (req, res) => {
	if (req.query.crn) {
		removeCRN(req.query.crn, req.user, db, (err) => {
			if (err) {
				res.json({
					success: false,
					error: err
				});
			} else {
				res.json({
					success: true
				});
			}
		});
	} else {
		res.json({
			success: false,
			error: 'Invalid Parameters.'
		});
	}
});

app.post('/mobile_api/addCRN', (req, res) => {
	if (req.query.crn && req.query.state) {
		checkCRN(req.query.crn, req.query.state, req.user, db, clientSocket, (err, crnInfo, isNew) => {
			if (err) {
				res.json({
					success: false,
					error: err
				});
			} else {
				res.json({
					success: true,
					data: crnInfo,
					new: isNew
				});
			}
		});
	} else {
		res.json({
			success: false,
			error: 'Invalid Parameters.'
		});
	}
});

//404
app.use((req, res) => {
	res.status(404).render('error_404', {
		url: req.url,
		path: 'Not Found'
	});
});

//HTTP Server init
server.listen(config.webserver.HTTP_PORT, config.webserver.HTTP_HOST);

//WHERE THE MAGIC HAPPENS
const crawlCRNS = require('./lib/crawlCRNS');

if (config.misc.enabled) {
	//Essentially, we need to crawl banner every x minutes and we need the function to loop.
	crawlCRNS(db);
	setInterval(async () => {
		await crawlCRNS(db);
	}, 300000)
}