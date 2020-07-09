const request = require('../request');
const response = require('../response');
exports.init = function (app) {
    return function expressInit(req, res, next) {
        //request文件可能用到res对象
        req.res = res;
        req.app = app;

        //response文件可能用到req对象
        res.req = req;

        Object.setPrototypeOf(req, request);
        Object.setPrototypeOf(res, response);


        next();
    }
}