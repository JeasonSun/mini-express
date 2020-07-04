// 带参数的路由  /info/:id/:age => info/1/2  => {id:1,age:2}

const express = require('../express');
const app = express();

app.get('/info/:id/:age', function(req, res){
    console.log(req.params);
    res.end(JSON.stringify(req.params));
});

app.listen(3000);