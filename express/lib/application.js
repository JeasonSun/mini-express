const http = require('http');
const Router = require('./router');
const methods = require('methods');
const middleware = require('./middleware/init');
const query = require('./middleware/query');

function Application() { }

Application.prototype.lazyrouter = function () {
    if (!this._router) {
        this._router = new Router();
        this._router.use(query());
        this._router.use(middleware.init(this));
    }
}

methods.forEach(method => {
    Application.prototype[method] = function (path, handlers) {
        this.lazyrouter();
        this._router[method](path, handlers);
    }
});

Application.prototype.use = function (path, handler) {
    this.lazyrouter();
    this._router.use(path, handler);
}

Application.prototype.param = function (key, handler) {
    this.lazyrouter();
    this._router.param(key, handler);
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
        this.lazyrouter();
        this._router.handle(req, res, done);
    });
    server.listen(...arguments); // 因为listen的参数其实是不固定的，这边直接解构app.listen的arguments参数，也可以使用server.listen.apply(server, arguments)   argument主要是port,callback等。
}

module.exports = Application;