const url = require('url');
const methods = require('methods');
const Route = require('./route');
const Layer = require('./layer');
const { nextTick } = require('process');

function Router() {
    this.stack = [];
}

methods.forEach(method => {
    Router.prototype[method] = function (path, handlers) {
        //创建router和layer
        // let route = this.route();
        let route = new Route();
        let layer = new Layer(path, route.dispatch.bind(route));
        layer.route = route;
        this.stack.push(layer);
        route[method](handlers);
    }
})

// 中间件会放到当前的路由系统中
Router.prototype.use = function (path, handler) {
    if (typeof path === 'function') {
        handler = path; // 给path默认值
        path = '/';
    }
    let layer = new Layer(path, handler); // 产生一层layer
    layer.route = undefined; // 如果route是undefined，说明他是中间件；
    this.stack.push(layer);
}

Route.prototype.route = function () {
    let route = new Route();
    let layer = new Layer(path, route.dispatch.bind(route));
    layer.route = route;
    return route;
}

Router.prototype.handle = function (req, res, out) {
    let { pathname } = url.parse(req.url);
    let index = 0;
    let dispatch = (err) => {

        if (this.stack.length === index) {
            return out(req, res);
        }
        let layer = this.stack[index++];
        // 如果用户传入了错误属性，要查找错误中间件
        if (err) {
            if (!layer.route) {// 中间件有两种可能： 错误中间件  普通中间件
                // 中间件处理函数的参数是4个的时候是错误处理中间件
                layer.handle_error(err, req, res, dispatch);
            } else {
                dispatch(err); // 是路由，直接忽略，err往下传
            }
        } else {
            // 路由或中间件 必须要求 路径匹配才OK

            if (layer.match(pathname)) { // layer有可能是中间件，还有可能是路由。
                if (!layer.route && layer.handler.length !== 4) { // 如果是中间件，直接执行对应的方法即可。
                    // 正常时候，不能执行错误中间件。
                    layer.handle_request(req, res, dispatch);
                } else {
                    if (layer.route.methods[req.method.toLowerCase()]) {
                        req.params = layer.params;
                        layer.handle_request(req, res, dispatch);
                    } else {
                        dispatch();
                    }
                }
            } else {
                dispatch();
            }
        }

    }
    dispatch();
}

module.exports = Router;