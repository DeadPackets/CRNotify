//Config
const config = require('./config.json');

//HTTP Server
const express = require('express')
const app = express();

//Functions
const sendEmail = require('./lib/sendEmail');

//Some optimizations
app.disable('x-powered-by')
app.disable('etag')


//HTTP Server init
app.listen(config.webserver.HTTP_PORT)
