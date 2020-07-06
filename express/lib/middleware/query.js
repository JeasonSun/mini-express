const url = require('url');
module.exports = function query() {

    return function (req, res, next) {
        if (!req.query) {
            const { query } = url.parse(req.url, true);
            req.query = query;
        }
        next();
    }
}