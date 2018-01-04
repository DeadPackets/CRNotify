//Lib

const sendIFTTT = require('./sendIFTTT');
const sendEmail = require('./sendEmail');

module.exports = (crn, newState, users) => {

  //First, we make an array of emails
  let recipients = users.map(function(user) {
    return user.email
  })

  //Join that array with commas
  let recipientsText = recipients.join(',')

  //Pass on the data to the sendEmail function! Done!
  sendEmail(recipientsText, {CRN: crn.crn, classCRN: crn.className, state: newState.toUpperCase(), fullClassName: crn.name}).then(function(){
    console.log('Emails sent succesfully! : ' + recipients)
  })

  //Next, the iFTTT stuff
  users.forEach(function(user, index){

    //If they have IFTTT enabled
    if (user.ifttt_enabled) {
      sendIFTTT(user.ifttt_key, crn.crn, crn.className, crn.state.toUpperCase())
    }
  })
}
