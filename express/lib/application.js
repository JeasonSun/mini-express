const http = require('http');
const url = require('url');

function Application() {
    this.router = [
        {
            path: "*",
            method: "*",
            handler(req, res) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/plain;charset=utf-8');
                res.end(`Cannot ${req.method} ${req.url}`);
            }
        }
    ];
}
/**
 * 挂载get路由
 * @param {*} path 路由
 * @param {*} handler 处理函数
 */
Application.prototype.get = function (path, handler) {
    this.router.push({
        path,
        method: 'get',
        handler
    })
}

/**
 * 监听请求到来，处理路由响应
 */
Application.prototype.listen = function () {
    let server = http.createServer((req, res) => {
        let { pathname } = url.parse(req.url); // 获取请求的路径；
        let requestMethod = req.method.toLowerCase(); // req.method都是大写
        for (let i = 1; i < this.router.length; i++) {
            let { method, path, handler } = this.router[i];
            if (pathname === path && requestMethod === method) {
                return handler(req, res);
            }
        }
        return this.router[0].handler(req, res);
    });
    server.listen(...arguments); // 因为listen的参数其实是不固定的，这边直接解构app.listen的arguments参数，也可以使用server.listen.apply(server, arguments)   argument主要是port,callback等。
}

module.exports = Application;