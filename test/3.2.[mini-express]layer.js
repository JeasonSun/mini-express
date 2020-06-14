const express = require('../express');
const app = express();

app.get('/home', function (req, res, next) {
    console.log('home1');
    next();
});
app.get('/home', function (req, res, next) {
    console.log('home2');
    res.end('Home');
});

app.get('/setting', function (req, res, next) {
    console.log('setting1');
    next();
}, function (req, res) {
    console.log('setting2');
    res.end('Setting');
});

app.listen(3000);