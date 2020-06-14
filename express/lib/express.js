const http = require('http');
const url = require('url');

function createApplication() {
    const router = [
        {
            path: "*",
            method: "*",
            handler(req, res) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/plain;charset=utf-8');
                res.end(`Cannot ${req.method} ${req.url}`);
            }
        }
    ]
    return {
        get: function (path, handler) {
            router.push({
                path,
                method: 'get',
                handler
            })
        },
        listen: function () {
            let server = http.createServer(function (req, res) {
                // 监听请求到来，处理响应
                let { pathname } = url.parse(req.url); // 获取请求的路径；
                let requestMethod = req.method.toLowerCase(); // req.method都是大写
                for (let i = 1; i < router.length; i++) {
                    let { method, path, handler } = router[i];
                    if (pathname === path && requestMethod === method) {
                        return handler(req, res);
                    }
                }
                return router[0].handler(req, res);
            });
            server.listen(...arguments); // 因为listen的参数其实是不固定的，这边直接解构app.listen的arguments参数，也可以使用server.listen.apply(server, arguments)   argument主要是port,callback等。
        }
    }
}

module.exports = createApplication;