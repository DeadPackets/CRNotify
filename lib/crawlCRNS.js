const request = require('request');
const config = require('../config.json');
const Horseman = require('node-horseman');
const cheerio = require('cheerio');

//Lib
const sendNotif = require('./sendNotif')

//Functions
function parseBody(body, subject, crns, db, resolve) {

  const $ = cheerio.load(body, {
    normalizeWhitespace: true,
    xmlMode: true,
    decodeEntities: true
  })

  //console.log(body)
  crns.forEach(function(crn, i) {

    //Dear god, i have suffered for this

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

    console.log(`CRN [${crn.dataValues.crn}]: Banner says ${status} [${newState}] and DB says ${currentState} [${crn.dataValues.state}]`)

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
      console.log('Faulty crawl.')
    }
  })

  resolve()
}

function fetchStatus(termID, subject, crns, db) {

  return new Promise(function(resolve, reject) {

    const horseman = new Horseman({
      cookiesFile: './cookies.txt',
      diskCache: true,
      diskCachePath: './browsercache',
      timeout: 10000,
      loadImages: false,
      ignoreSSLErrors: true
    });

    horseman.open('https://banner.aus.edu/axp3b21h/owa/bwckschd.p_disp_dyn_sched').waitForSelector('#term_input_id').cookies().evaluate(function(termID) {
      $('#term_input_id').val(termID)
    }, termID).click('input[value="Submit"]').waitForNextPage().cookies().evaluate(function(subject) {
      $('#subj_id').val(subject)
    }, subject).click('input[value="Class Search"]').waitForNextPage().html().then(function(body) {
      //Ok we got the HTML, time to parse it
      parseBody(body, subject, crns, db, resolve)
      return horseman.close()
    })
  })
}

module.exports = (db) => {
  if (db) {
    //Okay lets do this step by step
    //First, we need to find which subjects are we going to crawl
    db.sequelize.query('SELECT DISTINCT subject FROM crnStatuses').then(function(data) {
      if (data[0].length > 0) {
        //Voila, we have a list of subjects
        const subjects = data[0]

        //Loop through the subjects
        subjects.forEach(function(sub, index) {

          console.log('Starting fetch for ' + sub.subject)

          //Now we have to find all the CRNs associated with that subject
          db.crnStatus.findAll({
            where: {
              subject: sub.subject
            }
          }).then(function(crns) {

            //Lets fetch the page
            fetchStatus(config.misc.termID, sub.subject, crns, db).then(function() {
              return;
            })

          })

        })
      } else {
        console.log('Nobody subscribed to any CRNs!')
      }
    })
  } else {
    return;
  }
}
