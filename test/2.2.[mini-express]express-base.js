const express = require('../express');
const app = express();

app.get('/', function(req, res){
    res.end('route /');
});

app.get('/hello', function (req, res) {
    res.end('route /hello');
});

app.listen(3000, function(){
    console.log('server start')
});