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

module.exports = (user) => {

  return new Promise((resolve, reject) => {

      //Init mail options
      const mailOptions = {
        from: 'notifyCRN@gmail.com', // sender address
        to: user.email,
        subject: `Welcome to CRNotify!`, // Subject line
        html: `<h1>Welcome to CRNotify, ${user.name}</h1><p>Hey! Welcome to CRnotify. If you haven't added a CRN to your account, go ahead and do so!</p><p>If you have any questions or suggestions, feel free to email me at b00073615@aus.edu. Also, dont forget to read the <a href="https://crnotify.cf/faq">FAQ</a>!` // plain text body
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

  })

}
