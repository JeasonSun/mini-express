function Layer(path, handler) {
    this.path = path;
    this.handler = handler;
}

Layer.prototype.match = function (pathname) {
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

module.exports = Layer;