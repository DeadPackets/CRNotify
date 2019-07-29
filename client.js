/* eslint-disable no-console */
/* eslint-disable prefer-arrow-callback */
/* eslint-disable require-jsdoc */
/* eslint-disable quotes */

//Config
const config = require('./config.json');

//Socket
const io = require('socket.io-client');
const socket = io(config.misc.socketHost);

//Requires
const chalk = require('chalk');

