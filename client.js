/* eslint-disable no-console */
/* eslint-disable prefer-arrow-callback */
/* eslint-disable require-jsdoc */
/* eslint-disable quotes */

//Config
const config = require('./config.json');

//Socket
const io = require('socket.io-client');
const socket = io(config.misc.socketHost);

//Requires
const random_useragent = require('random-useragent');
const chalk = require('chalk');


//On connection
socket.on('connect', function () {
	console.log(chalk.green('Successfully connected!'));
});

socket.on('disconnect', function () {
	console.log(chalk.yellow('Disconnected from socket!'));
});

//Functions
function checkCRN(termID, crn, cb) {

	const Horseman = require('node-horseman');
	const horseman = new Horseman({
		// cookiesFile: './cookies.txt',
		// diskCache: true,
		// diskCachePath: './browsercache',
		timeout: 30000,
		loadImages: false,
		// proxyType: 'socks5',
		// proxy: '127.0.0.1:9050',
		ignoreSSLErrors: true
	});

	horseman
		.userAgent(random_useragent.getRandom())
		.on('error', function () {
			console.log(chalk.red(`Error crawling CRN!`));
			cb(true, null);
		})
		.on('timeout', function () {
			console.log(chalk.red(`Timeout crawling CRN!`));
			cb(true, null);
		})
		.cookies([])
		.open(`https://banner.aus.edu/axp3b21h/owa/bwckschd.p_disp_detail_sched?term_in=${termID}&crn_in=${crn}`)
		.catch(function () {
			console.log(chalk.red(`Error crawling CRN!`));
			cb(true, null);
		})
		.wait(10000)
	/* eslint-disable */
    .evaluate(function () {
      const final = {
        error: $('.errortext').text(),
        title: $('.ddlabel').text()
      }
      return final;
    })
    /* eslint-enable */
	/* eslint-disable no-console */
	/* eslint-disable prefer-arrow-callback */
	/* eslint-disable require-jsdoc */
	/* eslint-disable quotes */
		.then((data) => {
			horseman.close();
			cb(false, data);
		});
}

function fetchStatus(termID, subject, crn) {

	return new Promise(((resolve, reject) => {

		const Horseman = require('node-horseman');
		const horseman = new Horseman({
			// diskCache: true,
			// diskCachePath: './browsercache',
			timeout: 30000,
			loadImages: false,
			ignoreSSLErrors: true
		});

		horseman
			.userAgent(random_useragent.getRandom())
			.on('error', () => {
				reject();
			}, reject)
			.on('timeout', () => {
				console.log(chalk.red(`Timeout for ${subject}!`));
				reject();
			}, reject)
			.open(`https://banner.aus.edu/axp3b21h/owa/bwckschd.p_disp_listcrse?term_in=${termID}&subj_in=${subject}&crse_in=${crn.className.split(' ')[1]}&crn_in=${crn.crn}`)
			.wait(10000)
			.catch(() => {
				reject();
			}, reject)
		/* eslint-disable */
      .evaluate(function (data) {
		return $('.centeraligntext').text();
      }, {
        termID,
        subject,
        crn
      })
      /* eslint-enable */
		/* eslint-disable no-console */
		/* eslint-disable prefer-arrow-callback */
		/* eslint-disable require-jsdoc */
		/* eslint-disable quotes */
			.then((data) => {
				resolve(data);
			})
			.close();
	}));
}

//Socket handlers
socket.on(`checkCRN_${config.misc.secret}`, (termID, crn, cb) => {
	console.log(chalk.magenta(`Checking CRN ${crn}...`));
	checkCRN(termID, crn, cb);
	console.log(chalk.magenta(`Done checking ${crn}.`));
});

socket.on(`crawlCRN_${config.misc.secret}`, (termID, subject, crns, cb) => {

	console.log(chalk.blue(`Crawling subject ${subject}...`));
	let arr = [];
	crns.forEach((crn, i) => {
		console.log(chalk.white(`Crawling CRN ${crn.crn}`));
		fetchStatus(termID, subject, crn).then(body => {
			let res = {
				crn,
				status: body
			}
			arr.push(res);

			if (i === (crns.length - 1)) {
				console.log(chalk.green(`Done crawling ${subject}.`));
				cb(false, arr);
			}
		}).catch(() => {
			cb(true, null);
		});
	});

	// fetchStatus(termID, subject, crns).then((body) => {
	// 	cb(false, body);
	// 	console.log(chalk.blue(`Done crawling ${subject}.`));
	// }).catch(() => {
	// 	cb(true, null);
	// 	console.log(chalk.blue(`Done crawling ${subject}.`));
	// });

});

socket.on('auth', () => {
	socket.emit(`${config.misc.secret}`);
});