const express = require('../express');
const app = express();

app.use(function (req, res, next) {
    res.send = function (value) {
        if (Buffer.isBuffer(value) || typeof value === 'string') {
            res.end(value);
        } else if (typeof value === 'object') {
            res.end(JSON.stringify(value));
        }
    }
    next();
});

app.get('/', function (req, res, next) {
    res.send({
        name: 'mojie',
        age: 18
    })
});

app.listen(3000);