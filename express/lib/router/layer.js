const pathToRegExp = require('path-to-regexp');
function Layer(path, handler) {
    this.path = path;
    this.handler = handler;
    // 把路径转化成正则
    this.reg = pathToRegExp(this.path, this.keys = []);
}

Layer.prototype.match = function (pathname) {
    let match = pathname.match(this.reg);
    if (match) {
        this.params = this.keys.reduce((memo, current, index) => {
            memo[current.name] = match[index + 1];
            return memo;
        }, {});
        return true;
    }
    if (this.path === pathname) {
        return true;
    }
    // 如果是中间件，需要特殊处理
    if (!this.route) {
        if (this.path === '/') {
            return true;
        }
        return pathname.startsWith(this.path + '/');
    }
    return false;
}

Layer.prototype.handle_request = function (req, res, next) {
    this.handler(req, res, next);
}

Layer.prototype.handle_error = function (err, req, res, next) {
    if (this.handler.length === 4) {
        return this.handler(err, req, res, next);
    } else {
        next(err);
    }
}
module.exports = Layer;