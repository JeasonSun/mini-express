const Layer = require("./layer");
const methods = require('methods');

function Route() {
    this.stack = [];
}

Route.prototype.dispatch = function (req, res, out) {
    let index = 0;
    let method = req.method.toLowerCase();
    let dispatch = () => {
        if (this.stack.length === index) return out(req, res);
        let layer = this.stack[index++];
        if (layer.method === method) {
            layer.handle_request(req, res, dispatch);
        } else {
            dispatch();
        }
    }
    dispatch();
}

methods.forEach(method => {
    Route.prototype[method] = function (handlers) {
        handlers.forEach(handler => {
            let layer = new Layer('/', handler);
            layer.method = method;
            this.stack.push(layer);
        });
    }
})


module.exports = Route;