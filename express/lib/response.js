const http = require('http');
const path = require('path');
const fs = require('fs');
const mime = require('mime');
const res = Object.create(http.ServerResponse.prototype);

module.exports = res;

res.send = function (value) {
    if (Buffer.isBuffer(value) || typeof value === 'string') {
        this.end(value);
    } else if (typeof value === 'object') {
        this.end(JSON.stringify(value));
    }
}

res.sendFile = function (filename, { root }) {
    if (!filename) {
        throw new TypeError('filename argument is required to res.sendFile');
    }
    if (!root) {
        throw new TypeError('path must be absolute or specify root to res.sendFile');
    }

    const file = path.resolve(root, filename);
    if (!fs.existsSync(file)) {
        return this.send(`File is not exists : ${file}`);
    }
    const statObj = fs.statSync(file);
    if (statObj.isFile()) {
        this.setHeader('Content-Type', mime.lookup(file)+';charset=urf8');
        fs.createReadStream(file).pipe(this);

    } else {
        return this.send(`File is not exists : ${file}`);
    }


}