## 从零开始实现一个简易 Express 框架

### 1.前言

Express 是 Node.js 最流行的 Web 开发框架，相信很多 Node.js 初学者都是从 Express 实战开始的，它提供了丰富的 HTTP 工具，通过中间件和路由让程序的组织管理变得更加容易。常言道，学习不仅要知其然,还要使其所以然。作为开发者，我们需要学会使用 Express 框架，还需要深入其中原理，才能解决更多的问题。

这篇文章会通过需求迭代的方式，结合原生用例，不断完善 Express 功能，最终完成一个简易的 Express 的轮子。意在学习和理解 Express 的源码。本文的整体思路是参考“珠峰架构的手写 Express 框架公开课”。

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

然后我们结合一个最简单的 Demo：Hello world。

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

所以我们完善 `lib/express.js` 代码，添加一个 router 数组，并且在其中先创建一个 404 路由。

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

其实，实现 get 路由请求的逻辑很简单，就是往 router 中添加相应的路由信息。

```
 get: function (path, handler) {
    router.push({
        path,
        method: 'get',
        handler
    });
}
```

在 listen 函数中，当真正的请求到来的时候，根据不同的 path 和 method 去 router 系统中依次匹配，如果匹配成功就处理对应的 handler 函数，如果都没匹配到，就处理 404 路由。

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

我们创建 application.js 文件，并且把 createAppliction 函数中的主要逻辑代码放在 Application 类中，`lib/express.js` 只是用来创建一个应用实例。注意在修改 Appliction 的时候 this 指向问题，为了方便，这里使用箭头函数。具体结构代码可见分支：[step2-1](https://github.com/JeasonSun/mini-express/tree/step2-1)

### 3.版本 0.0.3 - 路由系统

#### 3.1 (优化)创建 Router 类

本节主要的需求是构建一个路由系统。上一节的优化，我们将创建 Application 和 Application 路由分离，但是 router 相关的逻辑在 Application 类中，为了很好的处理路由逻辑，我们封装一个 Router 类，集中维护路由数据和路由操作。

回顾一下 Application 中路由逻辑，router 是用一个数组来维护的，router 的操作主要有两个，分别是 application.get 函数和 application.listen 函数，前者用于添加路由，后者用来处理路由。首先，我们简单改造一下 Application 类，把相应的逻辑都提取出来，转由 Router 处理。

```
function Application() {
    this._router = new Router();
}
Application.prototype.get = function (path, handler) {
    this._router.get(path,handler);
}
Application.prototype.listen = function () {
    let server = http.createServer((req, res) => {
        function done (req, res){
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain;charset=utf-8');
            res.end(`Cannot ${req.method} ${req.url}`);
        }
        this._router.handle(req,res, done);
    });
    server.listen(...arguments);
}
```

这里值得注意的是，Router 中的默认 404 处理，我们把它留下来了，当路由系统无法处理的时候，就用这个 done 函数来处理。所以，接下来我们创建 Router 类时候，路由数组为空，并且遍历匹配路由应该改为从 i=0 开始。具体的 Router 类代码如下：

```
function Router() {
    this.stack = [];
}

Router.prototype.get = function (path, handler) {
    this.stack.push({
        path,
        method: 'get',
        handler
    });
}

Router.prototype.handle = function (req, res, out) {
    let { pathname } = url.parse(req.url);
    let requestMethod = req.method.toLowerCase();
    for (let i = 0; i < this.stack.length; i++) {
        let { method, path, handler } = this.stack[i];
        if (pathname === path && requestMethod === method) {
            return handler(req, res);
        }
    }
    return out(req, res);
}
```

如此一来，代码变得更加清晰，Application 和 Router 各司其职。运行代码，一切如故，但是有一个问题，随着路由不断的增多，this.stack 数组就会不断的增大，匹配路由的效率会不断降低，为了解决这个问题，需要仔细分析路由的组成部分。

#### 3.2 Layer 类

在 express 中，一个路由有路径、方法和处理函数组成。而路径和方法的关系并不是一对一，而是一对多，如：

```
GET      member/1
PUT      member/1
DELETE   member/1
```

如果将路径一样的路由整合成一组，显然效率会提高很多，于是引入了 Layer 的概念。

Layer 是 express Router 的核心部分，整个设计非常巧妙。首先对 Router、Layer、Route 三个类有一个初步的了解。我们先看一下 express 的 Demo 用例。

```
app.get('/home', function(req, res,next){
    console.log('home1');
    next();
});
app.get('/home', function(req, res, next){
    console.log('home2');
    res.end('Home');
});

app.get('/setting',function(req,res,next){
    console.log('setting1');
    next();
}, function (req, res) {
    console.log('setting2');
    res.end('Setting');
});
```

现在，我们记住上面的 Demo，然后依次学习 express 对于 Router、Layer、Route 的设计。

Router 是 express 中的整个路由管理系统，在这个 Router 系统中的 this.stack 数组的每一项，代表一个 Layer。每个 Layer 内部含有三个变量。注意，由于引入了 Layer 概念，之前我们在 router 的 this.stack 中 push 包含`path、method、handler`的路由对象信息，需要改为 push 两个 layer 实例，每个 layer 都有`path、handle、route`三个变量。

- path： 表示路由的路径。
- handle： 代表路由的处理函数。
- route：代表真正的路由。
  整体结构如下图所示：

```
------------------------------------------------
|     0     |     1     |     2     |     3     |
------------------------------------------------
| Layer     | Layer     | Layer     | Layer     |
|  |- path  |  |- path  |  |- path  |  |- path  |
|  |- handle|  |- handle|  |- handle|  |- handle|
|  |- route |  |- route |  |- route |  |- route |
------------------------------------------------
                  router.stack
```

这个 Layer 中并没有包含 method 属性，因为 method 属性在 Route 类中，另外，Route 有一个依次处理 stack 中函数的方法，Route 的结构如下：

```
------------------------------------------------
|     0         |     1         |     2         |
------------------------------------------------
| item          | item          | item          |
|  |- method    |  |- method    |  |- method    |
|  |- dispatch  |  |- dispatch  |  |- dispatch  |
------------------------------------------------
                  route 内部
```

这里先创建一个 Layer 类。

```
function Layer(path, handler){
    this.path = path;
    this.handler = handler;
}
```

然后创建一个 Route 类。

```
function Route(){
  this.stack = [];
}
Route.prototype.dispatch = function(req, res, out){
  // 处理this.stack中的函数
}
Route.prototype.get = function(handlers){
  // 把handlers存在this.stack中
}
```

接下来我们一步步修改 Router 类。

1. 修改 Router 中 get 方法

```
Router.prototype.get = function(path, handlers) {
    let route = new Route();
    let layer = new Layer(path, route.dispatch.bind(route));
    layer.route = route;
    this.stack.push(layer);
    route.get(handlers);
};
```

按照约定，在 get 的时候，首先应该创建一个 layer，参数分别是 path 和 handle，而这个 handle 是真正的 route，所以，我们先创建一个 Route 实例，然后把它真正处理 handlers 的方法传递给 layer，然后给 layer 添加一个`layer.route`的属性。真正的 handlers 在 route 内部，需要通过`route.get`传递进去。

注意：由于允许`app.get('/path', function(){}, function(){})`，所以，get 接收的`handler`参数修改为`...handlers`。

2. 修改 Route 中的 get 方法。
   原本我们可以直接把 handlers 加入到 stack 中，然后通过 dispatch 取出来依次处理函数，但是 express 做了更深一层的处理，在 Route 类的 stack 中仍然加入的是 layer 实例，这就让 Router 的整体处理逻辑保持了一致。代码如下：

```
Route.prototype.get = function(handlers){
    handlers.forEach(handler => {
        let layer = new Layer('/', handler);
        layer.method = 'get';
        this.stack.push(layer);
    });
}
```

3. 首层 layer 的处理，匹配 path 路径。
   请求过来的时候，首先进入 Router 中的 handle，handle 需要把 stack 中的 layer 依次与 path 进行匹配，如果没有匹配成功，就走下一个 layer。代码如下：

```
Router.prototype.handle = function (req, res, out) {
    let { pathname } = url.parse(req.url);
    let index = 0;
    let dispatch = () => {
        if (this.stack.length === index) {
            return out(req, res);
        }
        let layer = this.stack[index++];
        if (layer.match(pathname)) {
            layer.handle_request(req, res, dispatch);
        } else {
            dispatch();
        }
    }
    dispatch();
}
```

在上述代码中，给 Layer 类新加了 match 和 handle_request 方法。分别来判断是否匹配 layer 以及处理内部 handle 函数。逻辑简单，直接上代码：

```
Layer.prototype.match = function (pathname) {
    return this.path === pathname;
}

Layer.prototype.handle_request = function (req, res, next) {
    this.handler(req, res, next);
}
```

4. 在 route 中处理真正的 handlers，匹配 method 方法。
   Route 中处理 handlers 的逻辑和外层 Router 的处理是一致的，都是对 stack 中的 layer 进行匹配，匹配到了就交给 layer 的 handle_request 来处理 layer 上的 handle。代码如下：

```
Route.prototype.dispatch = function (req, res, out) {
    let index = 0;
    let method = req.method.toLowerCase();
    let dispatch = () => {
        if (this.stack.length === index) return out(req, res);
        let layer = this.stack[index++];
        if (layer.method === method) {
            layer.handle_request(req, res, dispatch);
        } else {
            dispatch();
        }
    }
    dispatch();
}
```

就此，我们完成了一个简单的路由系统，并在原始代码的基础上引入了 Layer 和 Route 两个概念，并修改了大量的代码。

具体结构代码可见分支：[step3](https://github.com/JeasonSun/mini-express/tree/step3)

5. 实现其他 method 处理
   因为其他的请求方式的处理逻辑和 GET 大同小异，所以，我们只需要每个 method 稍作修改即可。在 express 内部引用了 methods 包返回所有的请求方法。修改代码如下：

`lib/application.js`

```
methods.forEach(method => {
    Application.prototype[method] = function (path, ...handlers) {
        this._router[method](path, handlers);
    }
})
```

`lib/router/index.js`

```
methods.forEach(method => {
    Router.prototype[method] = function (path, handlers) {
        //创建router和layer
        // let route = this.route();
        let route = new Route();
        let layer = new Layer(path, route.dispatch.bind(route));
        layer.route = route;
        this.stack.push(layer);
        route[method](handlers);
    }
})
```

`lib/router/route.js`

```
methods.forEach(method => {
    Route.prototype[method] = function (handlers) {
        handlers.forEach(handler => {
            let layer = new Layer('/', handler);
            layer.method = method;
            this.stack.push(layer);
        });
    }
})
```

具体结构代码可见分支：[step3-1](https://github.com/JeasonSun/mini-express/tree/step3-1)

总结一下当前 express 各个部分的工作。

application 代表一个应用程序，express 是一个工厂类，负责创建 application 对象。Router 代表路由组件，负责应用程序的整个路由系统。组件内部由一个 Layer 数组构成，每个 layer 代表一组路径相同的路由信息，具体信息存储在 Route 内部，每个 Route 内部也是一个 Layer 对象，但是 Route 内部的 Layer 和 Router 内部的 Layer 存在一定的差异性。

- Router 内部的 Layer，主要包含 path、route 属性。
- Route 内部的 Layer，主要包含 method、handle 属性。

如果一个请求来临，会现从头至尾的扫描 router 内部的每一层，而处理每层的时候会先对比 URI，相同则扫描 route 的每一项，匹配成功则返回具体的信息，没有任何匹配则返回未找到。

最后，整个路由系统的结构如下：

```
 --------------
| Application  |                                 ---------------------------------------------------------
|     |        |        ----- -----------        |     0     |     1     |     2     |     3     |  ...  |
|     |-router | ----> |     | Layer     |       ---------------------------------------------------------
 --------------        |  0  |   |-path  |       | Layer     | Layer     | Layer     | Layer     |       |
  application          |     |   |-route | ----> |  |- method|  |- method|  |- method|  |- method|  ...  |
                       |-----|-----------|       |  |- handle|  |- handle|  |- handle|  |- handle|       |
                       |     | Layer     |       ---------------------------------------------------------
                       |  1  |   |-path  |                                  route
                       |     |   |-route |
                       |-----|-----------|
                       |     | Layer     |
                       |  2  |   |-path  |
                       |     |   |-route |
                       |-----|-----------|
                       | ... |   ...     |
                        ----- -----------
                             router
```
