const http = require('http');
const Router = require('./router');

function Application() {
    this._router = new Router();
}
/**
 * 挂载get路由
 * @param {*} path 路由
 * @param {*} handler 处理函数
 */
Application.prototype.get = function (path, ...handlers) {
    this._router.get(path, handlers);
}

/**
 * 监听请求到来，处理路由响应
 */
Application.prototype.listen = function () {
    let server = http.createServer((req, res) => {
        function done(req, res) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain;charset=utf-8');
            res.end(`Cannot ${req.method} ${req.url}`);
        }
        this._router.handle(req, res, done);
    });
    server.listen(...arguments); // 因为listen的参数其实是不固定的，这边直接解构app.listen的arguments参数，也可以使用server.listen.apply(server, arguments)   argument主要是port,callback等。
}

module.exports = Application;