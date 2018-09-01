module.exports = (body, user, db, cb) => {

	//I KNOW PEOPLE ARE GONNA PLAY GAMES SO I HAVE TO CHECK
	if (typeof(body.ifttt_key) === 'string' && typeof(body.ifttt_enabled) === 'boolean') {
		db.Users.update({
			ifttt_key: body.ifttt_key,
			ifttt_enabled: body.ifttt_enabled
		}, {
			where: {
				id: user.id
			}
		}).then(() => {
			cb(null);
		});
	} else {
		cb('Incorrect parameters. Are you messing with my website?');
	}

};
