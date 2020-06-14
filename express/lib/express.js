
function createApplication() {
    return {
        get: (path, fn) => { 
            console.log('app.get');
        },
        listen: (port, callback) => { 
            console.log('app.listen');
        }
    }
}

module.exports = createApplication;