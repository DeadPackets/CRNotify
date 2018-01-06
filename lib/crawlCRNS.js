const request = require('request');
const config = require('../config.json');
const cheerio = require('cheerio');
const chalk = require('chalk');
const minify = require('html-minifier').minify;

//Lib
const sendNotif = require('./sendNotif')

//Functions
function parseBody(body, subject, crns, db, cb) {

  const newBody = minify(body, {
  collapseBooleanAttributes: true,
  minifyCSS: true,
  minifyJS: true,
  minifyURLs: true,
  removeComments: true,
  removeEmptyAttributes: true,
  removeEmptyElements: true,
  removeOptionalTags: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true
});

  const initLoad = cheerio.load(newBody, {
    normalizeWhitespace: true,
    xmlMode: true,
  })

  let crnsProcessed = 0;

  crns.forEach(function(crn, i) {

    //Dear god, i have suffered for this
    const table = initLoad('.datadisplaytable').html()
    console.log(table)
    const status = $(`a[href="/axp3b21h/owa/bwckschd.p_disp_detail_sched?term_in=${config.misc.termID}&crn_in=${crn.dataValues.crn}"]`).parent().closest('tr').next().find('td[colspan="1"]').text()

    let currentState = ''

    if (crn.dataValues.state == 'closed') {
      currentState = 'N'
    } else {
      currentState = 'Y'
    }

    let newState = ''

    if (status.toUpperCase() == 'N') {
      newState = 'closed'
    } else {
      newState = 'open'
    }

    console.log(chalk.yellow(`CRN [${crn.dataValues.crn}]: Banner says ${status} [${newState}] and DB says ${currentState} [${crn.dataValues.state}]`))

    if (status.length > 0) {
      if (status.toUpperCase() == currentState) {
        //Nothing to do here
      } else {

        //SOUND THE ALARM
        db.sequelize.query('SELECT email,name,ifttt_enabled,ifttt_key FROM crns,users WHERE crns.userID = users.id AND crns.crn = ?', {
          replacements: [crn.dataValues.crn]
        }).then(function(data) {

          //Pass to the notification function
          const users = data[0]
          sendNotif(crn.dataValues, newState, users)

          //Update with the new state
          db.crnStatus.update({
            state: newState
          }, {
            where: {
              crn: crn.dataValues.crn
            }
          })

        })
      }
    } else {
      //console.log(body)
      console.log(chalk.red(`Faulty crawl for ${crn.dataValues.crn}, skipping...`))
    }

    crnsProcessed++;

    if (crnsProcessed == crns.length) {
      cb(false)
    }

  })

}


module.exports = (db, io, cb) => {
  if (db) {
    //Okay lets do this step by step
    //First, we need to find which subjects are we going to crawl
    db.sequelize.query('SELECT DISTINCT subject FROM crnStatuses').then(function(data) {
      if (data[0].length > 0) {
        //Voila, we have a list of subjects
        const subjects = data[0]
        let index = 0

        function startCrawl() {

          //Wait 30 seconds for RAM to clear
          // sleep.sleep(30)

          if (index > (subjects.length - 1)) {
            console.log(chalk.green('Done fetching everything!'))
            cb()
          } else {

            let sub = subjects[index];
            console.log(chalk.blue('Starting fetch for ' + sub.subject))

            db.crnStatus.findAll({
              where: {
                subject: sub.subject
              }
            }).then(function(crns) {

              //Lets fetch the page
              io.emit(`crawlCRN_${config.misc.secret}`, config.misc.termID, sub.subject, function(err, body){
                if (err) {
                  console.log(chalk.red(`ERROR for ${sub.subject}`))
                  startCrawl()
                } else {
                  parseBody(body, sub.subject, crns, db, function(err){
                    if (err) {
                      console.log(chalk.red(`ERROR for ${sub.subject}`))
                      startCrawl()
                    } else {
                      index++;
                      startCrawl()
                    }
                  })
                }
              })

            })
          }
        }

        //Lets get ready to craaaaawwwwwwwl!
        startCrawl()
      } else {
        console.log('Nobody subscribed to any CRNs!')
      }
    })
  } else {
    return;
  }
}
