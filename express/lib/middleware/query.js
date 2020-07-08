const url = require('url');
module.exports = function query() {

    return function (req, res, next) {
        const { query, path: reqPath } = url.parse(req.url, true);
        if (!req.query) {
            req.query = query;
        }
        if (!req.path) {
            req.path = reqPath;
        }
        next();
    }
}