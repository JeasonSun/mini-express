const express = require('../express');

const app = express();
app.post('/home', function (req, res, next) {
    console.log('post home 1');
    next();
});
app.post('/home', function (req, res, next) {
    console.log('post home 2');
    res.end('Post home res');
});
app.get('/home', function(req, res, next){
    console.log('get home 1');
    next();
});
app.get('/home', function(req, res, next){
    console.log('get home 2');
    res.end('Get home res');
});

app.listen(3000);
