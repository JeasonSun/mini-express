const url = require('url');
const Route = require('./route');
const Layer = require('./layer');

function Router() {
    this.stack = [];
}

Router.prototype.get = function (path, handlers) {
    //创建router和layer
    // let route = this.route();
    let route = new Route();
    let layer = new Layer(path, route.dispatch.bind(route));
    layer.route = route;
    this.stack.push(layer);
    route.get(handlers);
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
    let dispatch = () => {
        if (this.stack.length === index) {
            return out(req, res);
        }
        let layer = this.stack[index++];
        if (layer.match(pathname)) {
            layer.handle_request(req, res, dispatch);
        } else {
            dispatch();
        }
    }
    dispatch();
}

module.exports = Router;