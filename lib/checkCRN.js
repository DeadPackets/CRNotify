/* eslint-disable require-jsdoc */
/* eslint-disable no-console */
/* eslint-disable no-inner-declarations */

const chalk = require('chalk');

module.exports = async (info, db, user, browser, cb) => {
	if (info.crn.length > 10) {
		cb('CRN too long. Try not to be break my website. PLEASE.');
	} else {

		//Check if current year or future
		const currentYear = new Date().getFullYear()

		if (currentYear <= info.year) {
			//Let's build the termID
			let termID = info.year;
			switch (info.semester) {
				case "Fall":
					termID += "10";
					break;
				case "Spring":
					termID += "20";
					break;
				case "Summer I":
					termID += "30";
					break;
				case "Summer II":
					termID += "40";
					break;
				default:
					cb("Invalid semester selected.");
					break;
			}

			//If CRN exists, don't bother launching the browser
			db.crnStatus.findOne({
				where: {
					crn: info.crn,
					termID
				}
			}).then(async (newCRN) => {
				//It does exist, so just subscribe the user
				if (newCRN) {
					//Add the entry to the CRN table
					db.CRN.findOrCreate({
						where: {
							crn: info.crn,
							userID: user.id,
							termID
						},
						defaults: {
							crn: info.crn,
							userID: user.id,
							termID
						}
					}).spread((data, newCRN) => {
						if (newCRN) {
							cb(null, info, newCRN);
						} else {
							cb('You already subscribed to this CRN!');
						}
					});
				} else {
					//Launch up the browser
					console.log(chalk.blue(`Checking if ${termID} exists...`));
					const page = await browser.newPage();
					await page.setRequestInterception(true);
					page.on('request', (request) => {
						if (['image', 'stylesheet', 'font'].indexOf(request.resourceType()) !== -1) {
							request.abort();
						} else {
							request.continue();
						}
					});
					try {
						page.on('error', async (err) => { //For generic errors
							console.log(chalk.red(err));
							await page.close();
							cb("An error has occurred. If this persists, contact me.");
						});
						await page.goto('https://banner.aus.edu/axp3b21h/owa/bwckschd.p_disp_dyn_sched');
						await page.waitForSelector(`option[VALUE="${termID}`, {
							timeout: 10000
						}).catch(async () => {
							await page.close();
							cb("Invalid semester/year. Please check your inputs then try again.")
						});
	
						const result = await page.$eval(`option[VALUE="${termID}"`, async el => el.innerHTML).catch(async () => {
							//Do nothing, previous callback should have been called.
						});
	
						if (result === null) {
							await page.close();
							cb("Invalid semester/year. Please check your inputs then try again.");
						} else {
							//Instead of automating the post request, I'll automate behavior
							await page.select('select', termID);
							await page.waitForSelector('input[type="submit"]');
							await page.click('input[type="submit"]').catch(async () => {
								await page.close();
								console.log("INPUT TIMEOUT");
								cb("An error has occurred. If this persists, contact me.");
							});
							await page.waitForSelector('select[name="sel_subj"]', {
								timeout: 10000
							}).catch(async () => {
								await page.close();
								cb("An error has occurred. If this persists, contact me.");
							});
							await page.select('select[name="sel_subj"]', info.subject);
							await page.waitForSelector('input[type="submit"]').catch(async () => {
								await page.close();
								console.log("INPUT TIMEOUT");
								cb("An error has occurred. If this persists, contact me.");
							});
							await page.click('input[type="submit"]');
							await page.waitForSelector('table.datadisplaytable').catch(async () => {
								await page.close();
								cb("An error has occurred. If this persists, contact me.");
							});
							await page.waitForSelector(`tr a[href="/axp3b21h/owa/bwckschd.p_disp_detail_sched?term_in=${termID}&crn_in=${info.crn}"]`).catch(async () => {
								await page.close();
								cb("This course doesn't exist. Check your inputs then try again.");
							});
							const titleHeader = await page.$eval(`tr a[href="/axp3b21h/owa/bwckschd.p_disp_detail_sched?term_in=${termID}&crn_in=${info.crn}"]`, async el => el.innerHTML).catch(async () => {
								await page.close();
								cb("This course doesn't exist. Check your inputs then try again.");
							});
	
							//If we actually found the CRN, continue. Otherwise, let the callback fire (previous line)
							if (titleHeader) {
								const crnStatus = await page.$eval(`tr a[href="/axp3b21h/owa/bwckschd.p_disp_detail_sched?term_in=${termID}&crn_in=${info.crn}"]`, async el => el.parentElement.parentElement.nextElementSibling.querySelector('td[colspan]').innerText);
	
								//Let's parse the title
								const titleHeaderArr = titleHeader.split(' - ');
								const crnInfo = {
									className: titleHeaderArr[0].trim(),
									crn: titleHeaderArr[1],
									subject: titleHeaderArr[2].split(' ')[0],
									name: titleHeaderArr[2].split(' ')[0] + " " + titleHeaderArr[2].split(' ')[1],
									section: titleHeaderArr[3],
									termID
								}
	
								//We don't need the browser anymore, save RAM
								await page.close();
	
								//Now we have the status and the info, let's insert it into the database
								db.crnStatus.findOrCreate({
									where: {
										crn: info.crn
									},
									defaults: {
										subject: crnInfo.subject,
										name: crnInfo.name,
										className: crnInfo.className,
										section: crnInfo.section,
										state: crnStatus,
										termID
									}
								}).spread((entry, created) => {
									//Add the entry to the CRN table
									db.CRN.findOrCreate({
										where: {
											crn: crnInfo.crn,
											userID: user.id,
											termID
										},
										defaults: {
											crn: crnInfo.crn,
											userID: user.id,
											termID
										}
									}).spread((data, newCRN) => {
										if (newCRN) {
											cb(null, crnInfo, created);
										} else {
											cb('You already subscribed to this CRN!');
										}
									});
								});
							}
						}
					} catch(e) {
						console.log(chalk.red(`Uncaught exception: ${e}`));
						cb('An error occurred. If this persists, contact me.');
					}
				}
			});

		} else {
			cb("CRNotify doesn't support tracking semesters that already ended.")
		}
	}
};
