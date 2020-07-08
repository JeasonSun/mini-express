const path = require('path');

function View(name, options) {
    let opts = options || {};
    this.defaultEngine = opts.defaultEngine;
    this.root = opts.root;
    this.ext = path.extname(name);
    this.name = name;

    let fileName = name;
    // 如果那么中没有后缀，文件名中添加默认的后缀名，原则是：'.'+引擎名；
    if (!this.ext) {
        this.ext = this.defaultEngine[0] !== '.'
            ? '.' + this.defaultEngine
            : this.defaultEngine;

        fileName += this.ext;
    }
    this.engine = opts.engines[this.ext];
    this.path = this.lookup(fileName);
}

View.prototype.render = function render(options, callback) {
    this.engine(this.path, options, callback);
};

View.prototype.lookup = function (fileName) {
    return path.resolve(this.root, fileName);
}


module.exports = View;