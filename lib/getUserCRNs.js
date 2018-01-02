//All we do is get the data, and return it. ez pz.

module.exports = (user, db, cb) => {
  db.sequelize.query('SELECT subject,name,className,section,state FROM crns, crnStatuses WHERE crns.crn = crnStatuses.crn AND crns.userID = ?', {
    replacements: [user.id]
  }).then(function(data) {
    console.log(data[0])
    cb(null, "sample")
  })
}
