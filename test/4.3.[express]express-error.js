const express = require('express');
const app = express();

app.use(function (req, res, next) {
    let isError = Math.random() > 0.5;
    if (isError) {
        return next('中间件发生错误');
    }
    next();
});

app.get('/', function (req, res, next) {
    console.log('1');
    let isError = Math.random() > 0.5;
    if (isError) {
        return next('路由发生错误');
    }
    next();
});

app.get('/', function (req, res, next) {
    console.log('2');
    res.end('/');
});
app.use((err, req, res, next) => {
    res.setHeader('Content-Type', 'text/html;charset=utf8');
    res.end('Something Error : ' + err)
});

app.listen(3000);