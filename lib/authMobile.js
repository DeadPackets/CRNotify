module.exports = (token, db, cb) => {
  db.Users.findOne({
    where: {
      token: token
    }
  }).then(function(data){
    if (data) {
      cb(null, data.dataValues)
    } else {
      cb('User not found.')
    }
  })
}
