/* eslint-disable require-jsdoc */
/* eslint-disable no-console */

//Config
const config = require('./config.json');

//Socket
const io = require('socket.io-client');
const socket = io(config.misc.socketHost);

//Requires
const random_useragent = require('random-useragent');
const chalk = require('chalk');

//On connection
socket.on('connect', () => {
	console.log(chalk.green('Successfully connected!'));
});

socket.on('disconnect', () => {
	console.log(chalk.yellow('Disconnected from socket!'));
});

//Functions
function checkCRN(termID, crn, cb) {

	const Horseman = require('node-horseman');

	const horseman = new Horseman({
		// cookiesFile: './cookies.txt',
		diskCache: true,
		diskCachePath: './browsercache',
		timeout: 15000,
		loadImages: false,
		// proxyType: 'socks5',
		// proxy: '127.0.0.1:9050',
		ignoreSSLErrors: true
	});

	horseman
		.userAgent(random_useragent.getRandom())
		.on('error', (msg) => {
			console.log(chalk.red('Error crawling CRN!'));
			cb(true, null);
		})
		.on('timeout', () => {
			console.log(chalk.red('Timeout crawling CRN!'));
			cb(true, null);
		})
		.cookies([])
		.open(`https://banner.aus.edu/axp3b21h/owa/bwckschd.p_disp_detail_sched?term_in=${termID}&crn_in=${crn}`)
		.catch((e) => {
			console.log(chalk.red('Error crawling CRN!'));
			cb(true, null);
		})
		.wait(5000)
		.evaluate(() => {
			const final = {
				error: $('.errortext').text(),
				title: $('.ddlabel').text()
			};
			return final;
		})
		.then((data) => {
      horseman.close();
      cb(false, data);
		});
}

function fetchStatus(termID, subject, crns) {

	return new Promise(((resolve, reject) => {

		const Horseman = require('node-horseman');

		const postData = `term_in=${termID}&sel_subj=dummy&sel_day=dummy&sel_schd=dummy&sel_insm=dummy&sel_camp=dummy&sel_levl=dummy&sel_sess=dummy&sel_instr=dummy&sel_ptrm=dummy&sel_attr=dummy&sel_subj=${subject}&sel_crse=&sel_title=&sel_from_cred=&sel_to_cred=&sel_levl=%25&sel_instr=%25&sel_attr=%25&begin_hh=0&begin_mi=0&begin_ap=a&end_hh=0&end_mi=0&end_ap=a`;

		const horseman = new Horseman({
			// cookiesFile: './cookies.txt',
			diskCache: true,
			diskCachePath: './browsercache',
			timeout: 15000,
			loadImages: false,
			// proxyType: 'socks5',
			// proxy: '127.0.0.1:9050',
			ignoreSSLErrors: true
		});

		horseman
			.userAgent(random_useragent.getRandom())
			.on('error', (msg) => {
				reject();
			}, reject)
			.on('timeout', () => {
				console.log(chalk.red(`Timeout for ${subject}!`));
				reject();
			}, reject)
			.post('https://banner.aus.edu/axp3b21h/owa/bwckschd.p_get_crse_unsec', postData)
			.wait(5000)
			.catch((e) => {
				reject();
			}, reject)
			.evaluate((data) => {

				const array = [];

				data.crns.forEach((item, i) => {
					const a = $('a[href="/axp3b21h/owa/bwckschd.p_disp_detail_sched?term_in='+data.termID+'&crn_in='+item.crn+'"]').closest('tr').next().find('td[colspan="1"]').text();
					array.push({crn: item, status: a});
				});

				return array;
			}, {termID, subject, crns})
			.then((data) => {
				horseman.close();
				resolve(data);
			});
	}));
}

//Socket handlers
socket.on(`checkCRN_${config.misc.secret}`, (termID, crn, cb) => {
	console.log(chalk.blue(`Checking CRN ${crn}...`));
	checkCRN(termID, crn, cb);
	console.log(chalk.blue(`Done checking ${crn}.`));
});

socket.on(`crawlCRN_${config.misc.secret}`, (termID, subject, crns, cb) => {

	console.log(chalk.blue(`Crawling subject ${subject}...`));

	fetchStatus(termID, subject, crns).then((body) => {
		cb(false, body);
		console.log(chalk.blue(`Done crawling ${subject}.`));
	}).catch(() => {
		cb(true, null);
		console.log(chalk.blue(`Done crawling ${subject}.`));
	});

});

socket.on('auth', () => {
	socket.emit(`${config.misc.secret}`);
});
