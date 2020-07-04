const express = require('express');
const app = express();

const userRouter = express.Router();
userRouter.get('/add', function (req, res) {
    res.end('user add');
});
userRouter.get('/remove', function (req, res) {
    res.end('user remove');
});

const articleRouter = express.Router();
articleRouter.get('/add', function (req, res) {
    res.end('article add ');
});
articleRouter.get('/remove', function (req, res) {
    res.end('article remove');
});

app.use('/user', userRouter);
app.use('/article', articleRouter);

app.listen(3000);



