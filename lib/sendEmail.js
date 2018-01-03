//Import stuff
const nodemailer = require('nodemailer');
const config = require('../config.json');

//Get ready to send emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.email.SMTP_USER,
    pass: config.email.SMTP_PASS
  }
});

module.exports = (to, data) => {

  return new Promise((resolve, reject) => {

    //Check data
    if (data.classCRN && data.state && data.CRN && data.fullClassName) {

      //Init mail options
      const mailOptions = {
        from: 'notifyCRN@gmail.com', // sender address
        to: to, // list of receivers
        subject: `${data.classCRN} [${data.CRN}] is now ${data.state}!`, // Subject line
        html: `<h1>Alert for CRN ${data.CRN}!</h1><p>The class ${data.classCRN} (${data.fullClassName}) with the CRN ${data.CRN} is now ${data.state}!</p>` // plain text body
      };

      //Send the actual email
      transporter.sendMail(mailOptions, function(err, info) {
        if (err) {
          //uh oh.
          reject(err)
        } else {
          resolve(info)
        }
      });

    //Not enough parameters
    } else {
      reject('param_err')
    }

  })

}
