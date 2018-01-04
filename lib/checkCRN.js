const request = require('request');
const config = require('../config.json');
const cheerio = require('cheerio');

module.exports = (crn, currentStatus, user, db, cb) => {
  if (crn.length > 10) {
    cb('CRN too long. Try not to be break my website. PLEASE.')
  } else {

    function parseHTML(html) {

      //Pass loaded HTML to cheerio for parsing
      const $ = cheerio.load(html, {
        normalizeWhitespace: true,
        xmlMode: true
      })

      //Check for "CRN doesnt exist" error
      if ($('.errortext').length) {
        cb('Sorry. According to banner, this CRN doesnt exist.')
      } else {

        const title = $('th').text()

        if (title.length > 0) {

          //Well, that was easy
          const parsed = title.split(' - ')

          const crnInfo = {
            name: parsed[0],
            crn: parsed[1],
            className: parsed[2],
            section: parsed[3],
            subject: parsed[2].split(' ')[0],
            state: currentStatus
          }

          //Add it to the database, or just return it if it exists
          db.crnStatus.findOrCreate({
            where: {
              crn: crnInfo.crn
            },
            defaults: {
              subject: crnInfo.subject,
              name: crnInfo.name,
              className: crnInfo.className,
              section: crnInfo.section,
              state: crnInfo.state.toLowerCase()
            }
          }).spread(function(entry, created) {

            //Add the entry to the CRN table
            db.CRN.findOrCreate({
              where: {
                crn: crnInfo.crn,
                userID: user.id
              },
              defaults: {
                crn: crnInfo.crn,
                userID: user.id
              }
            }).spread(function(data, newCRN) {
              if (newCRN) {
                cb(null, created)
              } else {
                cb('You already subscribed to this CRN!')
              }
            })
          })
        } else {
          cb('Something went wrong with querying Banner. Wait for like 10 to 30 minutes and try again or contact me. (b00073615@aus.edu) [Code: 2]')
        }
      }
    }

    const Horseman = require('node-horseman');

    const horseman = new Horseman({
      cookiesFile: './cookies.txt',
      diskCache: true,
      diskCachePath: './browsercache',
      timeout: 10000,
      loadImages: false,
      ignoreSSLErrors: true
    });

    horseman
      .open(`https://banner.aus.edu/axp3b21h/owa/bwckschd.p_disp_detail_sched?term_in=${config.misc.termID}&crn_in=${crn}`)
      .cookies()
      .html()
      .then(function(body) {
        parseHTML(body)
        return horseman.close()
    })

  }
}
