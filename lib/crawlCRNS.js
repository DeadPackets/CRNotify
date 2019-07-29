/* eslint-disable require-jsdoc */
/* eslint-disable no-console */
/* eslint-disable no-inner-declarations */
const config = require('../config.json');
const chalk = require('chalk');
const puppeteer = require('puppeteer');

//Lib
const sendNotif = require('./sendNotif');

module.exports = async (db, io, cb) => {
	return new Promise((async resolve => {
		console.log(chalk.blue('Starting crawl...'));
		if (db) {
			//First, we need to find which semesters are we going to crawl
			let semesters = await db.sequelize.query('SELECT DISTINCT termID FROM crnStatuses');

			//Generate
			const semestersArr = semesters[0].map((x) => {
				return x.termID;
			});
			//if there are any subscriptions
			if (semestersArr.length > 0) {

				//Loop over semesters and get all the subjects in each semester
				const asyncLoop = async _ => {
					for (const sem of semestersArr) {
						console.log(chalk.blue(`Fetching subjects for semester ${sem}`));
						const subjects = await db.sequelize.query('SELECT DISTINCT subject FROM crnStatuses WHERE termID = ?', {
							replacements: [sem]
						});

						const subjectArr = subjects[0].map((x) => {
							return x.subject;
						});

						//Time to fire up puppeteer
						const browser = await puppeteer.launch();
						const page = await browser.newPage();
						page.on('error', async (err) => { //For generic errors
							console.log(chalk.red(err));
							await browser.close();
							console.log(chalk.red("Page error in crawling..."))
						});
						await page.goto('https://banner.aus.edu/axp3b21h/owa/bwckschd.p_disp_dyn_sched');
						await page.waitForSelector(`option[VALUE="${sem}`, {
							timeout: 10000
						}).catch(() => {
							console.log(chalk.red("TIMEOUT ERROR IN CRAWLCRNS, THIS SHOULD NOT HAPPEN"))
							resolve();
						}); //Timeout should never fire
						await page.select('select', sem);
						await page.click('input[type="submit"]')
						await page.waitForSelector('select[name="sel_subj"]', {
							timeout: 10000
						}).catch(async err => {
							await browser.close();
							console.log(chalk.red("Timeout error while crawling..."))
							resolve();
						});
						await page.select('select[name="sel_subj"]', ...subjectArr);
						await page.click('input[type="submit"]');
						await page.waitForSelector('table.datadisplaytable').catch(async err => {
							await browser.close();
							console.log(chalk.red("Timeout error while crawling..."))
							resolve();
						});

						//Great, now we loop through CRNs
						const crns = await db.crnStatus.findAll({
							where: {
								termID: sem
							}
						});
						
						for (const crn of crns) {
							console.log(chalk.blue(`Checking CRN ${crn.crn} (${sem}) [${crn.subject}]`))
							const crnStatus = await page.$eval(`tr a[href="/axp3b21h/owa/bwckschd.p_disp_detail_sched?term_in=${sem}&crn_in=${crn.crn}"]`, async el => el.parentElement.parentElement.nextElementSibling.querySelector('td[colspan]').innerText);

							//Check if the status changed
							console.log(chalk.magenta(`Database says ${crn.state} and Banner says ${crnStatus}`));

							if (crn.state !== crnStatus) {
								db.sequelize.query('SELECT * FROM crns, users WHERE crns.termID = ? AND crns.crn = ? AND crns.userID = users.id', {
									replacements: [sem, crn.crn]
								}).then(async data => {
									//Send out the notifications
									await sendNotif(crn.crn, crnStatus === "Y" ? "open" : "closed", data[0]);

									//Update the new status
									db.crnStatus.update({
										state: crnStatus
									}, {
										where: {
											crn: crn.crn
										}
									});
								})
							}
						}
					}
				}

				//Call the loop we just created
				await asyncLoop();
				resolve();
			} else {
				console.log(chalk.yellow('Nobody is subscribed to any CRNs!'));
				resolve();
			}

		} else {
			console.log(chalk.yellow('No database connection!'));
			resolve();
		}
	}));
};