/* eslint-disable require-jsdoc */
/* eslint-disable no-console */
/* eslint-disable no-inner-declarations */
const config = require('../config.json');
const chalk = require('chalk');

//Lib
const sendNotif = require('./sendNotif');

//Functions
function parseBody(array, subject, crns, db, cb) {

	let crnsProcessed = 0;

	array.forEach((item) => {

		const status = item.status;

		let currentState = '';

		if (item.crn.state === 'closed') {
			currentState = 'N';
		} else {
			currentState = 'Y';
		}

		let newState = '';

		if (status.toUpperCase() === 'N') {
			newState = 'closed';
		} else {
			newState = 'open';
		}

		console.log(chalk.yellow(`CRN [${item.crn.crn}]: Banner says ${status} [${newState}] and DB says ${currentState} [${item.crn.state}]`));

		if (status.length > 0) {
			if (status.toUpperCase() === currentState) {
				//Nothing to do here
			} else {

				//SOUND THE ALARM
				db.sequelize.query('SELECT email,name,ifttt_enabled,ifttt_key FROM crns,users WHERE crns.userID = users.id AND crns.crn = ?', {
					replacements: [item.crn.crn]
				}).then((data) => {

					//Pass to the notification function
					const users = data[0];
					sendNotif(item.crn, newState, users);

					//Update with the new state
					db.crnStatus.update({
						state: newState
					}, {
						where: {
							crn: item.crn.crn
						}
					});

				});
			}
		} else {
			//console.log(body)
			console.log(chalk.red(`Faulty crawl for ${item.crn.crn}, skipping...`));
		}

		crnsProcessed++;

		if (crnsProcessed === array.length) {
			cb(false);
		}

	});

}

module.exports = (db, io, cb) => {
	if (db) {
		//Okay lets do this step by step
		//First, we need to find which subjects are we going to crawl
		db.sequelize.query('SELECT DISTINCT subject FROM crnStatuses').then((data) => {
			if (data[0].length > 0) {
				//Voila, we have a list of subjects
				const subjects = data[0];
				let index = 0;

				function startCrawl() {

					//Wait 30 seconds for RAM to clear
					// sleep.sleep(30)

					if (index > (subjects.length - 1)) {
						console.log(chalk.green('Done fetching everything!'));
						cb();
					} else {

						const sub = subjects[index];
						console.log(chalk.blue('Starting fetch for ' + sub.subject));

						db.crnStatus.findAll({
							where: {
								subject: sub.subject
							}
						}).then((crns) => {

							//Lets fetch the page
							io.emit(`crawlCRN_${config.misc.secret}`, config.misc.termID, sub.subject, crns, (err, array) => {
								if (err) {
									console.log(chalk.red(`ERROR for ${sub.subject}`));
									startCrawl();
								} else {
									parseBody(array, sub.subject, crns, db, (err) => {
										if (err) {
											console.log(chalk.red(`ERROR for ${sub.subject}`));
											startCrawl();
										} else {
											index++;
											startCrawl();
										}
									});
								}
							});

						});
					}
				}

				//Lets get ready to craaaaawwwwwwwl!
				startCrawl();
			} else {
				console.log('Nobody subscribed to any CRNs!');
			}
		});
	} else {
		console.log('No database connection!');
	}
};
