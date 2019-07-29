//All we do is get the data, and return it. ez pz.

module.exports = (user, db, cb) => {
	db.sequelize.query('SELECT crns.crn,subject,name,className,section,crns.termID,state FROM crns, crnStatuses WHERE crns.crn = crnStatuses.crn AND crns.userID = ?', {
		replacements: [user.id]
	}).then((data) => {
		cb(null, data[0]);
	});
};
