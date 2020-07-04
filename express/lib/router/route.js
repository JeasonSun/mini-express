const Layer = require("./layer");
const methods = require('methods');

function Route() {
    this.stack = [];
    // 用与匹配路径的时候，加速匹配，如果没有此方法的处理，直接跳过即可。
    this.methods = {}; // 表示当前route中有哪些方法。
}

Route.prototype.dispatch = function (req, res, out) {
    let index = 0;
    let method = req.method.toLowerCase();
    let dispatch = (err) => {
        if (err) return out(err);
        if (this.stack.length === index) return out();
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
            this.methods[method] = true; //记录用户绑定的方法。
            this.stack.push(layer);
        });
    }
})


module.exports = Route;