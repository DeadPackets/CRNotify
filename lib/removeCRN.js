module.exports = (crn, user, db, cb) => {
	db.CRN.findAll({
		where: {
			crn: crn
		}
	}).then((data) => {
		if (data.length > 0) {
			//CRN exists in DB
			db.CRN.findOne({
				where: {
					crn: crn,
					userID: user.id
				}
			}).then((data2) => {
				if (data2) {
					if (data.length > 1) {
						//Multiple people subscribed to the same CRN, only remove subscription
						db.CRN.destroy({
							where: {
								crn: crn,
								userID: user.id
							}
						});

						cb(null);

					} else {
						//Just this one lonely boi, so we remove both his subscription and the CRN from the database
						db.CRN.destroy({
							where: {
								crn: crn,
								userID: user.id
							}
						});
						db.crnStatus.destroy({
							where: {
								crn: crn
							}
						});

						cb(null);
					}
				} else {
					cb('Sorry, but you cant remove a CRN that you aren\'t subscribed to!');
				}
			});
		} else {
			cb('Sorry, that CRN doesn\'t even exist in the database! (What are you doing?)');
		}
	});
};
