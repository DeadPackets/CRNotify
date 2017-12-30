const Sequelize = require('sequelize');
const conf = require('../config.json');

module.exports = () => {
  const sequelize = new Sequelize('crnotify_db', conf.database.DB_USER, conf.database.DB_PASS, {
    dialect: conf.database.SCHEMA,
    host: conf.database.DB_HOST,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    // logging: false
  });

  sequelize.authenticate().then(function(err) {
    console.log('Connection has been established successfully.');
  }, function(err) {
    throw err;
  });

  const CRN = sequelize.define('crns', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    crn: Sequelize.STRING,
    subject: Sequelize.STRING,
    state: Sequelize.STRING,
    usersSubbed: Sequelize.TEXT
  });

  const Users = sequelize.define('users', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    googleID: Sequelize.STRING,
    token: Sequelize.STRING,
    email: Sequelize.STRING,
    name: Sequelize.STRING,
    crns: Sequelize.TEXT,
    ifttt_enabled: Sequelize.BOOLEAN,
    ifttt_url: Sequelize.STRING
  })



  sequelize.sync({force: true})

  CRN.create({
    crn: '232323',
    state: 'closed',
    subject: 'BIO'
  })

  CRN.create({
    crn: '222222',
    state: 'closed',
    subject: 'BIO'
  })


  return {CRN, Users, sequelize}

}
