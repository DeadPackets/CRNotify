module.exports = (db, cb) => {
	const result = {};
	db.sequelize.query('SELECT crnStatuses.className,count(*) FROM crns,crnStatuses WHERE crns.crn = crnStatuses.crn GROUP BY crnStatuses.className HAVING count(*) > 5 ORDER BY count(*) DESC;').then((data) => {
		result.topSubjects = data[0];

		db.sequelize.query('SELECT crn,count(crn) FROM crns GROUP by crn HAVING count(crn) > 2 ORDER BY count(crn) DESC LIMIT 3;').then((data) => {
			result.topCRNs = data[0];

			db.sequelize.query('SELECT count(DISTINCT crn) FROM crns;').then((data) => {
				const temp = data[0];
				result.countCRNS = temp[0]['count(DISTINCT crn)'];

				db.sequelize.query('SELECT count(*) FROM users;').then((data) => {
					const temp = data[0];
					result.countUsers = temp[0]['count(*)'];

					db.sequelize.query('SELECT count(DISTINCT subject) FROM crnStatuses;').then((data) => {
						const temp = data[0];
						result.countSubjects = temp[0]['count(DISTINCT subject)'];

						cb(null, result);
					});
				});
			});
		});
	});
};
