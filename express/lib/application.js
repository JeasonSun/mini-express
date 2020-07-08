const http = require('http');
const Router = require('./router');
const methods = require('methods');
const middleware = require('./middleware/init');
const query = require('./middleware/query');
const View = require('./view');

function Application() {
    this.settings = {};
    this.engines = {};
}

Application.prototype.lazyrouter = function () {
    if (!this._router) {
        this._router = new Router();
        this._router.use(query());
        this._router.use(middleware.init(this));
    }
}

methods.forEach(method => {
    Application.prototype[method] = function (path, handlers) {
        if (method === 'get' && arguments.length === 1) {
            return this.set(path);
        }
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

Application.prototype.set = function (key, value) {
    if (arguments.length === 2) {
        this.settings[key] = value;
    } else {
        return this.settings[key];
    }
}

Application.prototype.engine = function (ext, fn) {
    var extension = ext[0] !== '.'
        ? '.' + ext
        : ext;
    this.engines[extension] = fn;
    return this;
};

Application.prototype.render = function (name, options, callback) {
    let done = callback;
    let engines = this.engines;
    // let opts = options;

    let view = new View(name, {
        defaultEngine: this.get('view engine'),
        root: this.get('views'),
        engines: engines
    });

    if (!view.path) {
        let err = new Error(`Failed to lookup view "${name}"`)
        return done(err);
    }
    try {
        view.render(options, callback);
    } catch (e) {
        return done(e);
    }

}

module.exports = Application;