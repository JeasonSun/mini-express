const path = require('path');
const fs = require('fs');
function serverStatic(root) {
    if (!root || typeof root !== 'string') {
        throw new TypeError('root path is invalid');
    }

    return function (req, res, next) {
        let absPath = path.join(root, (req.path || '/'));
        
        fs.stat(absPath, function (err, statObj) {
            if (err) {
                return next();
            }
            if (statObj.isFile()) {
                res.sendFile(absPath);
            } else {
                let indexHtml = path.join(absPath, 'index.html');
                if (fs.existsSync(indexHtml)) {
                    res.sendFile(indexHtml);
                } else {
                    next();
                }
            }
        })
    }
}

module.exports = serverStatic;