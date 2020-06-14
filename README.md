## 从零开始实现一个简易 Express 框架

### 1.前言

Express 是 Node.js 最流行的 Web 开发框架，相信很多 Node.js 初学者都是从 Express 实战开始的，它提供了丰富的 HTTP 工具，通过中间件和路由让程序的组织管理变得更加容易。常言道，学习不仅要知其然,还要使其所以然。作为开发者，我们需要学会使用 Express 框架，还需要深入其中原理，才能解决更多的问题。

这篇文章会通过需求迭代的方式，结合原生实例，不断完善 Express 功能，最终完成一个简易的 Express 的轮子。意在学习和理解 Express 的源码。本文的整体思路是参考珠峰架构的手写 Express 框架公开课。

代码链接： [https://github.com/JeasonSun/mini-express.git](https://github.com/JeasonSun/mini-express.git)

### 2.版本 0.0.1 - 初始化框架结构

在开始仿制前，我们先下载一下源代码，这里以官方 4.17.1 为例，我们来看一下 Express 的主要目录结构（其中省略了一些扩展功能文件）。

```
express
  |
  |-- lib
  |    |
  |    |-- express.js
  |    |-- application.js
  |    |-- router
  |          |-- index.js
  |          |-- route.js
  |          |-- layer.js
  |
  |-- index.js
```

然后我们结合一个最简单的实例：Hello world。

```
const express = require('express');
const app = express();
app.get('/', function (req, res) {
    res.send('Hello world');
});
app.listen(3000);
```

从实例中`const app = express()`我们看到 express 导出的是一个 function。我们追踪源码发现，在`express/index.js`文件中只有一句简单的`module.exports=require('./lib/express');`，而在`lib/express`中`exports = module.exports = createApplication;`，我们很容易推断出`createApplication`应该是一个 function，而且返回的对象会有 get 和 listen 两个方法。实现如下：

```
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
```

因此，我们参考 express 的目录结构，搭建一个 express 实现目录和一个 test 实例测试目录。我们约定`test/[express]xxx.js`文件是原生的测试用例，`test/[mini-express]/xxx.js`是我们自己实现的 mini-express 的测试用例。然后在接下来的步骤中，一步一步完善具体功能。

具体结构代码可见分支：[step1](https://github.com/JeasonSun/mini-express/tree/step1)

### 2.版本 0.0.2 - http 服务器和 get 请求

在上一阶段我们就确定了 app 会有两个方法，get 和 listen。其中 get 是 express 的路由，listen 是创建 http 服务器并且监听请求到来。

#### 2.1 实现 http 服务器

node.js 实现 http 服务器的方式比较简单，代码如下：

```
// 2.1.[mini-express]http-server.js

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
```

所以，参考上述方法，完善 express 的 listen 函数。

```
listen: function (port, callback) {
    let server = http.createServer(function (req, res) {
    // 监听请求到来，处理响应
    console.log('http server ...');
    });
    server.listen(port,callback);
}
```

由于 http.server 其实有很多的重载函数，参数的个数不能确定，为了和 http.listen 一致，我们可以将函数设置为 http.listen 的代理，以保持 app.listen 和 http.listen 的参数一致。

```
server.listen(...arguments);
// 或者
server.listen.apply(server,arguments);
```

node.js 中的 http 会建立 listen 监听，并且在 createServer 回调用拦截 http 请求，根据不同的 http 请求，绑定和执行不同的逻辑并响应客户端。

#### 2.2 实现 get 请求

真正的 http 请求到来时，根据不同的 path 路径，然后作出不同的逻辑处理和响应是 web 服务器的基本执行流程。每个 http 请求就是一个路由。一般的路由策略包括了 URL、method、body 等。不同的框架对于路由的管理规则略有不同，但基本逻辑管理一个 http 请求和业务逻辑映射函数。

app.get 是路由管理中的一个函数，主要负责添加 get 请求。参考 express 的路由设计，我们抽象出每个路由的属性：

- path 请求路径
- method 请求方法
- handler 处理函数

所以我们完善代码 express 代码，添加一个 router 数组，并且在其中先创建一个 404 路由。

```
const router = [
    {
        path: "*",
        method: "*",
        handler(req, res) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain;charset=utf-8');
            res.end(`Cannot ${req.method} ${req.url}`);
        }
    }
]
```

实现 get 路由请求，主要就是往 router 中添加相应的路由信息。

```
 get: function (path, handler) {
    router.push({
        path,
        method: 'get',
        handler
    });
}
```

在 listen 函数中，等待真正的请求到来的时候，根据不同的 path 和 method 去 router 系统中依次匹配，如果匹配成功就处理对应的 handler 函数，如果都没匹配到，就处理 404 路由。

```
listen: function () {
    let server = http.createServer(function (req, res) {
        let { pathname } = url.parse(req.url); // 获取请求的路径；
        let requestMethod = req.method.toLowerCase(); // req.method都是大写
        for (let i = 1; i < router.length; i++) { // 从i=1开始
            let { method, path, handler } = router[i];
            if (pathname === path && requestMethod === method) {
                return handler(req, res);
            }
        }
        return router[0].handler(req, res);
    });
    server.listen(...arguments);
}
```

到此，基础的 get 和 listen 功能就已经完成了，我们可以运行测试用例查看效果。具体结构代码可见分支：[step2](https://github.com/JeasonSun/mini-express/tree/step2)

**优化：** 逻辑拆分，实现创建应用和应用逻辑的分离。
我们创建 application.js 文件，并且把 createAppliction 函数中的主要逻辑代码放在 Application 类中，express 只是用来创建一个应用实例。注意在修改Appliction的时候this指向问题，为了方便，这里使用箭头函数。具体结构代码可见分支：[step2-1](https://github.com/JeasonSun/mini-express/tree/step2-1)
