const express = require("../express");
const app = express();
// express 中的中间件可以放置路径，这个路径的规则和cookie中的path一样，
app.use(function (req, res, next) {
    req.a = 1;
    next();
});
app.use('/', function (req, res, next) {
    req.a++;
    next();
});

app.use('/a', function (req, res, next) {
    req.a++;
    next();
});

app.get('/', function (req, res) {
    res.end(req.a + '')
})

app.get('/a', function (req, res) {
    res.end(req.a + '')
})

app.listen(3000);