const url = require('url');
const methods = require('methods');
const Route = require('./route');
const Layer = require('./layer');

function Router() { // express.Router返回的结果会放到app.use()上
    let router = (req, res, next) => { // 当路由中间件匹配到后会执行此方法， 需要去当前stack中依次取出执行，如果处理不了，调用next，匹配下一个中间件。
        router.handle(req, res, next);
    };
    router.__proto__ = proto;
    router.stack = [];
    router.paramsCallback = {}; // {key: [fn, fn]}
    return router;
}

let proto = {};

methods.forEach(method => {
    proto[method] = function (path, ...handlers) {
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
proto.use = function (path, handler) {
    if (typeof path === 'function') {
        handler = path; // 给path默认值
        path = '/';
    }
    let layer = new Layer(path, handler); // 产生一层layer
    layer.route = undefined; // 如果route是undefined，说明他是中间件；
    this.stack.push(layer);
}

proto.route = function () {
    let route = new Route();
    let layer = new Layer(path, route.dispatch.bind(route));
    layer.route = route;
    return route;
}

proto.handle = function (req, res, out) {
    let { pathname } = url.parse(req.url);
    let index = 0;
    let removed = '';
    let dispatch = (err) => {

        if (this.stack.length === index) {
            return out(req, res);
        }
        if (removed) {
            req.url = removed + req.url;
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
                    // 在这里把中间件的路径删除掉
                    // /user/add /user
                    if (layer.path !== '/') {
                        removed = layer.path;
                        req.url = req.url.slice(removed.length);
                    }
                    layer.handle_request(req, res, dispatch);
                } else {
                    if (layer.route.methods[req.method.toLowerCase()]) {
                        req.params = layer.params;

                        this.process_params(layer, req, res, () => {
                            layer.handle_request(req, res, dispatch);
                        })

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

proto.param = function (key, handler) { // 发布订阅
    if (this.paramsCallback[key]) {
        this.paramsCallback[key].push(handler);
    } else {
        this.paramsCallback[key] = [handler];
    }
}

proto.process_params = function (layer, req, res, done) {
    //如果没有动态参数，直接done
    if (!layer.keys || !layer.keys.length) {
        return done();
    }
    let keys = layer.keys.map(item => item.name);
    let params = this.paramsCallback;
    let index = 0;
    function next() {
        if (index == keys.length) {
            return done();
        }
        let key = keys[index++];
        processCallback(key, next);
    }
    next();
    function processCallback(key, out) {
        let fns = params[key];
        let idx = 0;
        let value = req.params[key]
        function next() {
            if (fns.length === idx) { return out() }
            let fn = fns[idx++];
            fn(req, res, next, value, key);
        }
        next();
    }
}


module.exports = Router;