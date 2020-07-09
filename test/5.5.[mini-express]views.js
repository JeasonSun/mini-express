const express = require('../express');
const ejs = require('ejs');
const path = require('path');
const app = express();

// 设置查找路径
app.set('views', path.join(__dirname, 'view'));
// 设置默认后缀
app.set('view engine', 'html');
// 如果是html后缀，需要按照ejs来渲染；
app.engine('html', ejs.__express);

app.get('/', function (req, res, next) {
    
    res.render('hello', { name: 'mojie' });

});

app.listen(3000);

