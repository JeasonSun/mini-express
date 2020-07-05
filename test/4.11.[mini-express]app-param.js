const express = require("../express");
const app = express();

app.param('id', function (req, res, next, value, key) {
    req.params.id = value + 10;
    next();
});

app.param('age', function (req, res, next, value, key) {
    if (value > 18) {
        next();
    } else {
        res.end('No admission to 18 years of age');
    }
});


app.get('/info/:id/:age', function (req, res, next) {
    res.end(JSON.stringify(req.params));
});

app.get('/', function (req, res, next) {
    res.end('OK');
});

app.listen(3000);