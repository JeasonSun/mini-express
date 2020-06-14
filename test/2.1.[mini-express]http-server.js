const http = require('http');
const port = 3000;
const server = http.createServer((req, res) =>{
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain;charset=utf-8');
    res.end('Hello World');
});
server.listen(port,() => {
    console.log(`Server start at localhost:${port}`)
});