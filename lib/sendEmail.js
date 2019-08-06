//Import stuff
const nodemailer = require('nodemailer');
const config = require('../config.json');

//Get ready to send emails
const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: config.email.SMTP_USER,
		pass: config.email.SMTP_PASS
	}
});

module.exports = (to, data, newState) => {

	return new Promise((resolve, reject) => {

		//Check data
		if (data && newState) {
			//Init mail options
			const mailOptions = {
				from: 'notifyCRN@gmail.com', // sender address
				to: to, // list of receivers
				subject: `${data.name} [${data.crn}] is now ${newState}!`, // Subject line
				html: `<h1>Alert for CRN ${data.crn}!</h1><p>The class ${data.name} (${data.className}) with the CRN ${data.crn} is now ${newState}!</p>` // plain text body
			};

			//Send the actual email
			transporter.sendMail(mailOptions, (err, info) => {
				if (err) {
					//uh oh.
					reject(err);
				} else {
					resolve(info);
				}
			});

			//Not enough parameters
		} else {
			reject('Not enough parameters to send an email!');
		}

	});

};
