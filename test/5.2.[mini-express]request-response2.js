const express = require('../express');
const app = express();

app.get('/', function (req, res, next) {
    console.log(req.query.aa)
    res.send({
        name: 'mojie',
        age: 18
    })
});

app.get('/file/:filename', function (req, res, next) {
    let { filename } = req.params;
    res.sendFile(filename, { root: __dirname });

})
app.listen(3000);