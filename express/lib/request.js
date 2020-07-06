const http = require('http');
const url = require('url');


const req = Object.create(http.IncomingMessage.prototype);

module.exports = req;

