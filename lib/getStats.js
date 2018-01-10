module.exports = (db, cb) => {
  var result = {}
  db.sequelize.query('SELECT crnStatuses.className,count(*) FROM crns,crnStatuses WHERE crns.crn = crnStatuses.crn GROUP BY crnStatuses.className HAVING count(*) > 5 ORDER BY count(*) DESC;').then(function(data) {
    result.topSubjects = data[0]

    db.sequelize.query('SELECT crn,count(crn) FROM crns GROUP by crn HAVING count(crn) > 2 ORDER BY count(crn) DESC LIMIT 3;').then(function(data) {
      result.topCRNs = data[0]

      db.sequelize.query('SELECT count(DISTINCT crn) FROM crns;').then(function(data) {
        var temp = data[0]
        result.countCRNS = temp[0]['count(DISTINCT crn)']

        db.sequelize.query('SELECT count(*) FROM users;').then(function(data) {
          var temp = data[0]
          result.countUsers = temp[0]['count(*)']

          db.sequelize.query('SELECT count(DISTINCT subject) FROM crnStatuses;').then(function(data) {
            var temp = data[0]
            result.countSubjects = temp[0]['count(DISTINCT subject)']

            cb(null, result)
          })
        })
      })
    })
  })
}
