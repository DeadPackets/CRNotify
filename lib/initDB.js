/* eslint-disable require-jsdoc */
/* eslint-disable no-console */
/* eslint-disable no-inner-declarations */
const Sequelize = require('sequelize');
const conf = require('../config.json');
const chalk = require('chalk');

module.exports = () => {
	//A connection string is nicer, no?
	const sequelize = new Sequelize(`sqlite:./crnotify.db`, {logging: conf.database.logging});

	const crnStatus = sequelize.define('crnStatus', {
		crn: {
			type: Sequelize.STRING,
			primaryKey: true
		},
		termID: Sequelize.STRING,
		subject: Sequelize.STRING,
		className: Sequelize.STRING,
		name: Sequelize.STRING,
		section: Sequelize.STRING,
		state: Sequelize.STRING
	});

	const CRN = sequelize.define('crns', {
		id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			primaryKey: true
		},
		crn: Sequelize.STRING,
		termID: Sequelize.STRING,
		userID: Sequelize.INTEGER
	}, {
		indexes: [
			{
				unique: false,
				fields: ['crn']
			}
		]
	});

	const Users = sequelize.define('users', {
		id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			primaryKey: true
		},
		googleID: Sequelize.STRING,
		token: Sequelize.STRING,
		email: Sequelize.STRING,
		name: Sequelize.STRING,
		ifttt_enabled: {
			type: Sequelize.BOOLEAN,
			defaultValue: false
		},
		ifttt_key: Sequelize.STRING,
		darkMode: {
			type: Sequelize.BOOLEAN,
			defaultValue: false
		}
	});

	sequelize.authenticate().then(() => {
		console.log(chalk.green('Connection has been established successfully.'));
	}, (err) => {
		throw err;
	});

	sequelize.sync({force: conf.database.forceSync});

	return {crnStatus, CRN, Users, sequelize};

};
