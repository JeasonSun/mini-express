const Application = require('./application');
const Router = require('./router');

function createApplication() {
    return new Application();
}
createApplication.Router = Router;

exports = module.exports = createApplication;

exports.static = require('./middleware/server-static');