/* eslint-disable require-jsdoc */
/* eslint-disable no-console */
/* eslint-disable no-inner-declarations */
//Lib
const sendIFTTT = require('./sendIFTTT');
const sendEmail = require('./sendEmail');

module.exports = (crn, newState, users) => {
	return new Promise(resolve => {
		//First, we make an array of emails
		const recipients = users.map((user) => {
			return user.email;
		});

		//Join that array with commas
		const recipientsText = recipients.join(',');

		//Pass on the data to the sendEmail function! Done!
		sendEmail(recipientsText, {
			CRN: crn.crn,
			classCRN: crn.className,
			state: newState.toUpperCase(),
			fullClassName: crn.name
		}).then(() => {
			console.log(`Emails sent to [${recipients}] about CRN [${crn.crn}] for (${crn.state} => ${newState})`);
		});

		//Next, the iFTTT stuff
		users.forEach((user) => {

			//If they have IFTTT enabled
			if (user.ifttt_enabled) {
				sendIFTTT(user.ifttt_key, crn.crn, crn.className, crn.state.toUpperCase());
			}
		});

		resolve();
	})
};