const Sequelize = require('sequelize');
const conf = require('../config.json');

module.exports = () => {
  // const sequelize = new Sequelize('crnotify_db', conf.database.DB_USER, conf.database.DB_PASS, {
  //   dialect: conf.database.SCHEMA,
  //   host: conf.database.DB_HOST,
  //   pool: {
  //     max: 5,
  //     min: 0,
  //     acquire: 30000,
  //     idle: 10000
  //   },
  //    logging: false
  // });

  const sequelize = new Sequelize('crnotify_db', 'root', null, {
    dialect: conf.database.SCHEMA,
    host: '127.0.0.1',
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

  const crnStatus = sequelize.define('crnStatus', {
    crn: {
      type: Sequelize.STRING,
      primaryKey: true
    },
    subject: Sequelize.STRING,
    name: Sequelize.STRING,
    className: Sequelize.STRING,
    section: Sequelize.STRING,
    state: Sequelize.STRING
  });

  const CRN = sequelize.define('crns', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    crn: Sequelize.STRING,
    userID: Sequelize.INTEGER
  }, {
    indexes: [
      {
        unique: false,
        fields: ['crn']
      }
    ]
  })

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
    ifttt_enabled: Sequelize.BOOLEAN,
    ifttt_key: Sequelize.STRING
  })

  sequelize.sync({force: true})

  return {crnStatus, CRN, Users, sequelize}

}
