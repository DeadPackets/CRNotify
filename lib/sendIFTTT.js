/* eslint-disable require-jsdoc */
/* eslint-disable no-console */
/* eslint-disable no-inner-declarations */
const request = require('request');

module.exports = (key, crn, className, state) => {
	request(`https://maker.ifttt.com/trigger/crnotify/with/key/${key}?value1=${className}&value2=${crn}&value3=${state}`, (err) => {
		if (err) {
			console.log(err);
		} else {
			return true;
		}
	});
};
