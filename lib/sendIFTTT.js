const request = require('request');

module.exports = (key, crn, className, state) => {
  request(`https://maker.ifttt.com/trigger/crnotify/with/key/${key}?value1=${className}&value2=${crn}&value3=${state}`, function(err, res, body) {
    if (err) {
      console.log(err)
    } else {
      return true;
    }
  })
}
