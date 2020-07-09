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
Router.prototype.get = function(path, ...handlers) {
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

6. 优化匹配速度

我们先来看一个 Demo
`test/3.3.[mini-express]optimize-match.js`

```
app.post('/home', function(req, res, next){
    console.log('post home 1');
    next();
});
app.post('/home', function(req, res, next){
    console.log('post home 2');
    res.end('Post home res');
});
app.get('/home', function(req, res, next){
    console.log('get home 1');
    next();
});
app.get('/home', function(req, res, next){
    console.log('get home 2');
    res.end('Get home res');
});
```

接着在`lib/router/route.js`中的 dispatch 中添加一个输出`console.log('inner')`，然后运行测试代码，查看输出。

```
inner
inner
inner
get home 1
inner
get home 2
```

通过观察可以看到，虽然访问的是`GET /home`，但是由于 Router 在匹配 Layer 层的时候只匹配了路径`/home`，写在前面的`POST /home`每次都会被匹配到，并且进入 Route 执行 dispatch。明显这部分可以优化：在匹配第一层 Layer 时判断该 Layer 中的 route 是否包含此种请求方法，如果不包含，可以直接跳过此 Layer。具体修改如下：

- `lib/route.js`

```diff
function Route() {
    this.stack = [];
+   this.methods = {}; // 表示当前route中有哪些方法。
}

methods.forEach(method => {
    Route.prototype[method] = function (handlers) {
        handlers.forEach(handler => {
            let layer = new Layer('/', handler);
            layer.method = method;
+           this.methods[method] = true; //记录用户绑定的方法。
            this.stack.push(layer);
        });
    }
})
```

`lib/router/index.js`

```diff
- if (layer.match(pathname)) {
+ if (layer.match(pathname) && layer.route.methods[req.method.toLowerCase()]) {
    layer.handle_request(req, res, dispatch);
} else {
    dispatch();
}
```

7. 优化 lazyrouter

在 Express 源码中有处理 lazyrouter，作用是不在引入`express()`后立即创建一个`router`实例，而是在需要的时候才创建。代码如下：

`lib/application.js`

```diff
function Application() {
-    this._router = new Router();
}
+ Application.prototype.lazyrouter = function () {
+    if (!this._router) {
+        this._router = new Router();
+    }
+ }

methods.forEach(method => {
    Application.prototype[method] = function (path, ...handlers) {
+       this.lazyrouter();
        this._router[method](path, handlers);
    }
});

Application.prototype.listen = function () {
    let server = http.createServer((req, res) => {
       ...
+       this.lazyrouter();
        this._router.handle(req, res, done);
    });
      ...
}
```

到此，本节需求已经基本完成，具体结构代码可见分支：[step3-1](https://github.com/JeasonSun/mini-express/tree/step3-1)

最后，总结一下当前 express 各个部分的工作。

application 代表一个应用程序，express 是一个工厂类，负责创建 application 对象。Router 代表路由组件，负责应用程序的整个路由系统。组件内部由一个 Layer 数组构成，每个 layer 代表一组路径相同的路由信息，具体信息存储在 Route 内部，每个 Route 内部也是一个 Layer 对象，但是 Route 内部的 Layer 和 Router 内部的 Layer 存在一定的差异性。

- Router 内部的 Layer，主要包含 path、route、handle 属性。
- Route 内部的 Layer，主要包含 method、handle 属性。

如果一个请求来临，会现从头至尾的扫描 router 内部的每一层，而处理每层的时候会先对比 URI，相同则扫描 route 的每一项，匹配成功则返回具体的信息，没有任何匹配则返回未找到。

最后，整个路由系统的结构如下：
![路由系统结构图](https://static01.imgkr.com/temp/96e9b18ad63d4c518080d132fcee7e7c.jpg)

### 4.版本 0.0.4 - 中间件

本次迭代主要目标是实现 Express 的中间件机制。Express 中的中间件其实就是一个函数，它的内部可以访问和修改请求和响应对象，并且通过 next 函数控制是否向下继续执行。

中间件的功能包括：

- 执行任何代码
- 修改请求和响应对象
- 终结请求-响应循环
- 调用堆栈中的下一个中间件

如果当前中间件没有终结请求-响应循环，则必须调用`next()`方法，将控制权交给下一个中间件，否则请求就会被挂起。

Express 应用中可以使用如下几种中间件：

- 应用级中间件
- 路由级中间件
- 错误处理中间件
- 内置中间件
- 第三方中间件

#### 4.1 应用级中间件

应用级中间件，其使用方法是 Application 类上的两种方式：Application.METHOD (HTTP 的各种请求方法）和 Application.use，前者我们已经实现了，现在来实现 Application.use。

Application.use 和 Application.METHOD 的逻辑是一致的，都是 Router 的代理。不同的是：普通路由中`layer.route`属性指向 Route 对象，`layer.handle`属性指向`Route.dispatch`函数。而在中间件中，同样是创建一个 layer 实例放入`router.stack`队列中，只是中间件的 layer 没有 route 属性，即`layer.route = undefined`，layer.handle 指向中间件处理函数。等待请求到来，`Router.handle`根据不同的`layer.route`是否有值来判断是普通的路由还是中间件，并做相应的处理。

接下来，我们一步步修改代码：

`lib/application.js`

```
Application.prototype.use = function (path, handler) {
    this.lazyrouter();
    this._router.use(path, handler);
}
```

由于 Express 允许中间件省略 path 参数，所以需要兼容处理一下，当只传一个参数，且为`function`的时候，设置默认`path = '/'`。

`lib/router/index.js`

```
Router.prototype.use = function (path, handler) {
    if (typeof path === 'function') {
        handler = path; // 给path默认值
        path = '/';
    }
    let layer = new Layer(path, handler); // 产生一层layer
    layer.route = undefined; // 如果route是undefined，说明他是中间件；
    this.stack.push(layer);
}
```

接下来重点处理`Router.prototype.handle`函数，根据 layer 是普通路由还是中间件做不同处理。先判断是否匹配到路径，如果没有匹配路径，直接执行下一个 layer，如果匹配到路径且是中间件，执行对应的方法即可。如果是普通路由且 layer.route 中有此 Method，就进入 Route，执行`Route.dispatch`任务。否则跳转下一层 layer。

```diff
- if (layer.match(pathname) && layer.route.methods[req.method.toLowerCase()]) {
+ if (layer.match(pathname)) {
+   if (!layer.route) { // 如果是中间件，直接执行对应的方法即可。
+       layer.handle_request(req, res, dispatch);
+   } else {
+       if (layer.route.methods[req.method.toLowerCase()]) {
            layer.handle_request(req, res, dispatch);
+       } else {
+           dispatch();
+       }
+   }
} else {
    dispatch();
}
```

在中间件中，匹配 path 并不是全等匹配，只要匹配起始位置即可，所以需要修改一下 Layer 中的 match 方法，代码如下：

```
Layer.prototype.match = function (pathname) {
    if (this.path === pathname) {
        return true;
    }
    // 如果是中间件，需要特殊处理
    if (!this.route) {
        if (this.path === '/') {
            return true;
        }
        return pathname.startsWith(this.path + '/');
    }
    return false;
}
```

具体结构代码可见分支：[step4](https://github.com/JeasonSun/mini-express/tree/step4)

#### 4.2 错误处理中间件

在 Express 中捕捉错误的方法有两种，首先我们看一下原生情况下的 demo。

```
app.use(function (req, res, next) {
    let isError = Math.random() > 0.5;
    if (isError) {
        return next('中间件发生错误');
    }
    next();
});

app.get('/', function (req, res, next) {
    console.log('1');
    let isError = Math.random() > 0.5;
    if (isError) {
        return next('路由发生错误');
    }
    next();
});

app.get('/', function (req, res, next) {
    console.log('2');
    res.end('/');
});

app.use((err, req, res, next) => {
    res.setHeader('Content-Type', 'text/html;charset=utf8');
    res.end('Something Error : ' + err)
});
```

当我们调用`next`的时候，如果传递了参数，那么我们就认为发生了错误。现在，思考一下在中间件中的 next 和路由处理函数中的 next 是否是一样的？通过前面篇章的了解到，在中间件中的 next 其实是调用了第一层`router/index.js`中的`handle.dispatch`，而在路由处理函数中的 next 是调用了第二层`route.js`中的`dispatch`方法。

在普通路由处理中，如果已经发生了错误，应该直接跳出路由至第一层 layer，往下寻找错误处理中间件，所以先修改`route.js`。

```diff
Route.prototype.dispatch = function (req, res, out) {
    ...
+    let dispatch = (err) => {
-    let dispatch = () => {
+        if (err) return out(err);
+        if (this.stack.length === index) return out();
-        if (this.stack.length === index) return out(req, res); //FIX:修复一个bug，out的时候不能传递参数，一旦有参数就代表已经报错了。
        let layer = this.stack[index++];
        ...
    }
    dispatch();
}
```

在第一层 layer 循环处理中，如果发生错误，应该直接寻找错误处理中间件。当`layer.route`有值，说明是普通路由，则需要直接传递错误信息，寻找下一个。如果是中间件，可能是普通中间件和错误处理中间件，按照约定，错误处理中间件的参数是 4 个，如果是普通中间件也直接跳过并传递错误信息，直到遇到错误处理中间件执行错误处理函数。

```diff
Router.prototype.handle = function (req, res, out) {
    ...
    let dispatch = (err) => {
        ...
        let layer = this.stack[index++];
        // 如果用户传入了错误属性，要查找错误中间件
+        if (err) {
+            if(!layer.route){// 中间件有两种可能： 错误中间件  普通中间件
+                // 中间件处理函数的参数是4个的时候是错误处理中间件
+                layer.handle_error(err, req, res, dispatch);
+            }else {
+                dispatch(err); // 是路由，直接忽略，err往下传
+            }
+        } else {
            ...
+        }

    }
    dispatch();
}
```

在`layer.js`中添加`handle_error`处理函数。

```
Layer.prototype.handle_error = function(err, req, res, next){
    if(this.handler.length === 4){
        return this.handler(err, req, res, next);
    } else {
        next(err);
    }
}
```

最后，在正常情况下，如果没有发生错误，不应该执行错误中间件，所以还需要稍微修改一下`router/index.js`中`!err`情况下中间件判断的时候，中间件参数不能为 4。

```diff
if (layer.match(pathname)) { // layer有可能是中间件，还有可能是路由。
+    if (!layer.route && layer.handler.length !== 4) {
-    if (!layer.route) {
        ...
    }
}
```

#### 4.3 动态路由

大家对动态路由应该不陌生，在 React、Vue 等路由系统中也都有使用到，先来看一个 demo。

```
app.get('/info/:id/:age', function(req, res){
    console.log(req.params);
    res.end(JSON.stringify(req.params));
});
```

当访问`/info/1/2`的时候，页面会显示`{ "id": "1", "age": "2" }`。如果访问`/info/1`，页面会报错。由此说明，我们定义路由时候的`id`、`age`是占位符，不能不传。那这是怎么做到的呢？基础思路如下：

1. 把配置的路由转化成一个正则。
2. 请求时把 url 与正则匹配。

首先，模拟一个实际请求路径，然后用正则匹配，明确需要把路由规则转化成的正则模型。

```
let requestUrl = '/info/1/2';
let reg = new RegExp('/info/([^/]+)/([^/]+)');
let result = requestUrl.match(reg);
console.log(result);

/**
 *  输出result如下：
 * [
 *    '/info/1/2',
 *    '1',     // ---------- :id
 *    '2',     // ---------- :age
 *    index: 0,
 *    input: '/info/1/2',
 *    groups: undefined
 * ]
*/
```

所以，只要把定义的路由规则`/info/:id/:age`转化为字符串`/info/([^/]+)/([^/]+)`，通过匹配路由就能得到`id`和`age`。在路由规则转为正则字符的时候，将`:id`替换为`id`，并且将 id 保存下来，以便后续一一对应。

```
let configUrl = '/info/:id/:age';
let keys = [];
let configRegString = configUrl.replace(/:([^\/]+)/g, function () {
    keys.push(arguments[1]);
    return '([^\/]+)'
});
console.log(configRegString, keys);

/**
 *  输出如下：
 *  /info/([^/]+)/([^/]+) [ 'id', 'age' ]
*/
```

最后就是将数组`[,1,2,]`和 keys`[id,age]`对应组合成`{id:1,age:2}`。整体的核心思路就是将用户的路由配置转化成正则，和当前请求的路径匹配拿到结果。由于此路由逻辑在 React 等路由系统中也常用，所以有现成库`path-to-regexp`，express 中也使用了此库。接下来，逐步修改`mini-express/lib/router/layer.js`。

```diff
function Layer(path, handler) {
    ...
    // 把路径转化成正则
+    this.reg = pathToRegExp(this.path, this.keys = []);
}

Layer.prototype.match = function (pathname) {
+    let match = pathname.match(this.reg);
+    if (match) {
+        this.params = this.keys.reduce((memo, current, index) => {
+            memo[current.name] = match[index + 1];
+            return memo;
+        }, {});
+        return true;
+    }
    ...
}
```

在`router/index.js`中，在匹配到路由后，给`req`添加`params`属性。

```diff
Router.prototype.handle = function (req, res, out) {
    ...
    if (layer.match(pathname)) {
        if (!layer.route && layer.handler.length !== 4) {
            ...
        } else {
            if (layer.route.methods[req.method.toLowerCase()]) {
+                req.params = layer.params;
                layer.handle_request(req, res, dispatch);
            } else {
                dispatch();
            }
        }
    } else { dispatch(); }
}
```
到此，本节需求已经基本完成，具体结构代码可见分支：[step4-1](https://github.com/JeasonSun/mini-express/tree/step4-1)

#### 4.4 二级路由

在 Express 中有路由中间件的概念，也就是通常我们所说的二级路由。在开发过程中，合理的路由分配和部署，能够让整体结构和逻辑清晰。先来看一个实际用例。创建两个路由`userRouter`和`articleRouter`，然后在`app`上应用这两个路由。

```
/********* user相关路由，可以提出放在 user-router.js *********/
const userRouter = express.Router();
userRouter.get('/add', function (req, res) {
    res.end('user add');
});
userRouter.get('/remove', function (req, res) {
    res.end('user remove');
});

/********* article相关路由，可以提出放在 article-router.js *********/
const articleRouter = express.Router();
articleRouter.get('/add', function (req, res) {
    res.end('article add ');
});
articleRouter.get('/remove', function (req, res) {
    res.end('article remove');
});

app.get('/', function(req, res){ res.end('Home'); });
app.use('/user', userRouter);
app.use('/article', articleRouter);

app.listen(3000);
```

从上述 demo 看，子路由是由`express.Router()`创建的，所以，首先在 express 上挂载 Router 类，便于使用。`lib/exporess.js`增加代码如下：

```
const Router = require('./router');
function createApplication() {
    return new Application();
}
createApplication.Router = Router;
```

但是问题来了，目前`express.Router()`执行完毕返回的是`undefined`，按照上述 demo 的使用`app.use('/user', userRouter)`，userRouter 是一个中间件，所以应该一个函数方法`function(req,res,next){}`。所以，我们来改造一个`lib/index.js`。

```
function Router() { // express.Router返回的结果会放到app.use()上
    this.stack = [];
    let router = (req, res, next) => { };
    return router;
}
```

这样一来，`application`中的`new Router()`返回的就是一个函数，在它上面并没有`prototype`上方法，所以需要通过修改原型链来让 router 找到这些方法。我们定义一个对象`proto={}`，将所有`Router.proptotype`上的方法都放到`proto`上，然后`router.__proto__ = proto`，这样就形成了原型链，在`router`上也能访问到`use`、`handle`、`METHOD`等方法了。

```
function Router() {
    // this.stack = [];  // this应该修改为router
    let router = (req, res, next) => { };
    router.__proto__ = proto;
    router.stack = [];
    return router;
}

let proto = {};

methods.forEach(method => {
    proto[method] = function (path, handlers) { ... }
})
proto.use = function (path, handler) { ... }
proto.route = function () { ... }
proto.handle = function (req, res, out) { ... }
```

经过上述修改，先测试一下原本的路由功能是否正常，先把子路由相关的代码注释，只剩`app.get('/', function(req, res){ res.end('Home'); });`这个路由，然后访问`/`，查看目前功能是否一切正常。接下来，继续完善子路由逻辑。

分析一下`userRouter`，我们在`userRouter`这个子路由中加入了两个 layer`add`和`remove`，保存在`router.stack`中，当请求到来时候，`app.use('/user', userRouter)`匹配到中间件，走到我们刚刚写的`let router = (req, res, next) => { };`函数，在这里应该依次取出`stack`的`layer`执行，如果处理不了，调用 next，匹配下一个中间件。。

```diff
function Router() {
    let router = (req, res, next) => {
+       router.handle(req, res, next);
    };
    ...
}
```

到现在似乎已经完成了二级路由，但是现实调试有问题，并没有匹配到二级路由里的`add`和`remove`。什么原因呢，因为`app.use`匹配到`user`的后，交给`handle`处理，匹配的时候`url`是`/user/add`，但是在`stack`的`layer`中保存的`path`是`/add`。怎么解决这个问题呢？我们在匹配到`user`中间件后，先删除`/user`，剩下`/add`，这样接下来匹配`/add`的时候就能顺利匹配了，我们修改一下`router/index.js`中的代码。

```diff
 if (!layer.route && layer.handler.length !== 4) { // 如果是中间件，直接执行对应的方法即可。
    // 正常时候，不能执行错误中间件。
    // 在这里把中间件的路径删除掉
    // /user/add /user
    // /home / 如果中间件就是/不应该删除 /
    if (layer.path !== '/') {
        req.url = req.url.slice(layer.path.length);
    }
}
```

现在还遗留了一个问题，假设我们在写中间件路由的时候，写了两个 user 路由中间件，那么问题就出现了，由于匹配第一个 user 路由中间件的时候，将`/user`已经删除了，如果没有匹配到，跳转下一个 user 路由中间件的时候，也必然是匹配不到的。

```
userRouter1.get('add', function(){});
userRouter2.get('info', function(){});
// 访问 /user/info
app.use('/user', userRouter1); // 这边已经删除了 /user 并且没有匹配到 /info，跳转下一个 '/user'
app.use('/user', userRouter2); //此时的url是  /info，直接不匹配
```

所以，需要在 next 的时候把删除的`/user`重新加回来。

```diff
proto.handle = function (req, res, out) {
    ...
+    let removed = '';
    let dispatch = (err) => {
        ...
+        if (removed) {
+            req.url = removed + req.url;
+        }
        ...
        if (!layer.route && layer.handler.length !== 4) {
            if (layer.path !== '/') {
-                req.url = req.url.slice(layer.path.length);
+                removed = layer.path;
+                req.url = req.url.slice(removed.length);
            }
            layer.handle_request(req, res, dispatch);
        }

    }
    dispatch();
}
```

【bug 修复】：在`app.get`中的处理函数应该是一个数组，之前的代码这个数组的解构放在了`application.js`中，由于二级路由中`Router`类可以直接调用，所以，我们把这个数组解构放到`router/index.js`中。

```diff
-Application.prototype[method] = function (path, ...handlers) {}
+Application.prototype[method] = function (path, handlers) {}
```

```diff
-proto[method] = function (path, handlers)
+proto[method] = function (path, ...handlers)
```

至此，二级路由的功能就已经完成了，具体代码见具体结构代码可见分支：[step4-2](https://github.com/JeasonSun/mini-express/tree/step4-2)

#### 4.5 app.param

在 Express 中`app.param`方法可以用于验证参数，可以理解为对参数进行过滤的一个中间件。本小节就来实现这个方法，先结合 demo 理解一下`app.param`的实际用途。

```
app.param('id', function (req, res, next, value, key) {
    req.params.id = value + 10;
    next();
});

app.param('age', function (req, res, next, value, key) {
    if (value > 18) {
        next();
    } else {
        res.end('No admission to 18 years of age');
    }
});

app.get('/info/:id/:age', function (req, res, next) {
    res.end(JSON.stringify(req.params));
});

app.get('/', function (req, res, next) {
    res.end('OK');
});
```

通过 demo 我们可以观察到，当配置路径中有参数`id`和`age`时，会先走预先定义的`app.param`逻辑进行参数检查更新，然后走到真正的路由方法中执行。对于`app.get('/')`没有匹配到参数的路径不受影响。要实现这个功能，很容易想到发布订阅模式。

1. 订阅

```
// lib/application.js
Application.prototype.param = function (key, handler){
    this.lazyrouter();
    this._router.param(key, handler);
}

// lib/router/index.js
function Router() {
   router.paramsCallback = {}; // {key: [fn, fn]}
}

proto.param = function (key, handler){ // 发布订阅
    if(this.paramsCallback[key]){
        this.paramsCallback[key].push(handler);
    }else {
        this.paramsCallback[key] = [handler];
    }
}
```

2. 发布：路由和方法匹配到后，在执行函数前将订阅好的事件执行一下。

```diff
proto.handle = function(req, res, out){
+    this.process_params(layer, req, res, () => {
          layer.handle_request(req, res, dispatch);
+    })
}
```

```
proto.process_params = function (layer, req, res, done) {
    //如果没有动态参数，直接done
    if (!layer.keys || !layer.keys.length) {
        return done();
    }
    let keys = layer.keys.map(item => item.name);
    let params = this.paramsCallback;
    let index = 0;
    function next() {
        if (index == keys.length) {
            return done();
        }
        let key = keys[index++];
        processCallback(key, next);
    }
    next();
    function processCallback(key, out) {
        let fns = params[key];
        let idx = 0;
        let value = req.params[key]
        function next() {
            if (fns.length === idx) { return out() }
            let fn = fns[idx++];
            fn(req, res, next, value, key);
        }
        next();
    }
}
```

至此，`app.param`的功能就已经完成了，路由系统的主要功能逻辑也完成，具体代码见具体结构代码可见分支：[step4-3](https://github.com/JeasonSun/mini-express/tree/step4-3)


### 5.版本 0.0.5-内置中间件

前面小节已经将 Express 的整体逻辑已经完成了，本次迭代主要目标是实现 Express 的一些内置中间件。主要包括以下功能：

- 封装 request 和 response 两个对象

#### 5.1 封装 request 和 response

为了方便框架使用，Express 在 request 和 response 对象上封装了很多常用的方法。例如在 Express 中最常用的`res.send()`，原生的`res.end()`的参数只能是`String`或者`Buffer`，不能是对象，我们可以封装一下，通过参数类型的不同，返回不同的响应数据。为了达到此功能，可以在最开始的部分添加一个中间件，扩展`res`，添加一个`res.send`方法。

```
app.use(function (req, res, next) {
    res.send = function (value) {
        if (Buffer.isBuffer(value) || typeof value === 'string') {
            res.end(value);
        } else if (typeof value === 'object') {
            res.end(JSON.stringify(value));
        }
    }
    next();
});

app.get('/', function (req, res, next) {
    res.send({
        name: 'mojie',
        age: 18
    })
});
```

但显然不能把内置的中间件写在业务逻辑中，我们在`mini-express`中提取这部分的代码。由于内置中间件的优先级是最高的，可以在创建`Router`后就加载中间件。`lib/application.js`

```diff
const middleware = require('./middleware/init');

Application.prototype.lazyrouter = function () {
    if (!this._router) {
        this._router = new Router();
+       this._router.use(query());   // 扩展req的属性
+       this._router.use(middleware.init(this));  // 扩展req,res的方法
    }
}
```

然后就是`lib/middleware/init.js`。从上述代码可以推断出`middleware.init()`是一个中间件函数，接下来我们就编写这个中间件。主要的功能是把自定义的`request`和`response`对象扩展到原生的`req`、`res`的原型或者原型链上。

```
const request = require('../request');
const response = require('../response');
exports.init = function (app) {
    return function expressInit(req, res, next) {
        //request文件可能用到res对象
        req.res = res;

        //response文件可能用到req对象
        res.req = req;

        Object.setPrototypeOf(req, request);
        Object.setPrototypeOf(res, response);

        next();
    }
}
```

这里有一个套路，为什么`init`是一个闭包方法，执行后才返回中间件函数？因为这样就可以传递参数了。其他的一些内容中间件或者第三方中间件大多都是如此。

接下来就是`request.js`和`response.js`，导出的是一个对象，这个对象直接扩展原生 http 上的`http.IncomingMessage.prototype`和`http.ServerResponse.prototype`。

```
// request.js
const http = require('http');
const req = Object.create(http.IncomingMessage.prototype);
module.exports = req;

// response.js
const http = require('http');
const res = Object.create(http.ServerResponse.prototype);
module.exports = res;
```

现在框架已经搭建好了，可以自由的扩展`req`和`res`了。在 Express 框架中，`request`和`response`对象有很多非常好用的函数，不过大部分和框架结构无关，并且主要是专注细节的处理，在本文中就不再一一介绍了，直接在`request.js`和`response.js`中粗略实现几个，大家有兴趣可以直接查看文件或者 Express 源代码中的相关文件。

列举一下扩展的情况：

- req.query
- req.path
- res.send()
- res.sendFile()

```
// lib/middleware/query.js
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
```

```
// response.js
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
```

#### 5.2 常用中间件

本小节的主要目标是熟悉 Express 常用的中间件，首先我们来比较一下 Express、Koa，看一下两个框架的中间件内置情况。

| Express         | Koa            | 解释               |
| --------------- | -------------- | ------------------ |
| express(内置)   | koa-router     | 路由系统           |
| body-parser     | koa-bodyparser | body 解析中间件    |
| multer          | koa2-multer    | 文件上传中间件     |
| express(内置)   | koa-views      | 视图渲染模板中间件 |
| cookie-parser   | cookie(内置)   | cookie 处理中间件  |
| express-session | koa-session    | session 处理中间件 |

Koa 和 Express 同出一门，都把很多逻辑都抽象成中间件处理，方便用户定制安装。本节以 express 的视图渲染中间件，简单介绍中间件的写法，为大家扩展中间件提供思路。

首先，依旧还是看一下 Express 是怎么设置模板引擎的。

```
// 设置查找路径，如果不设置，默认为根目录下的views文件夹
app.set('views', path.join(__dirname, 'view'));
// 设置默认后缀
app.set('view engine', 'html');
// 如果是html后缀，需要按照ejs来渲染；
app.engine('html', ejs.__express);

app.get('/', function (req, res, next) {
    res.render('hello', { name: 'mojie' });
});
```

从实例出发，先看渲染引擎函数的实现，上面的 demo 使用了`ejs`渲染引擎，通过查看`ejs`官网，简单的`ejs`使用方法如下：

```
let ejs = require('ejs'),
    people = ['geddy', 'neil', 'alex'],
    html = ejs.render('<%= people.join(", "); %>', {people: people});
```

也就是说，`res.render`其实是在调用设置好的模板引擎的`render`方法而已。在此之前，我们需要完善一下设置方法`app.set`其实就是在 app 上维护一个`settings`变量的一个过程，这里值得一提的是，我们可以通过参数的个数来控制`set`方法的功能，当只有一个参数时，实际是`get`的功能。

```
function Application() {
    this.settings = {};
}
Application.prototype.set = function (key, value) {
    if (arguments.length === 2) {
        this.settings[key] = value;
    } else {
        return this.settings[key];
    }
}
```

接着实现 app.get 函数。因为现在已经有了一个 app.get 方法用来设置路由，所以需要在该方法上进行重载。

```
methods.forEach(method => {
    Application.prototype[method] = function (path, handlers) {
        if(method ==='get' && arguments.length === 1){
            return this.set(path);
        }
        this.lazyrouter();
        this._router[method](path, handlers);
    }
});
```

完成了`app.set`后，其实就在`app`维护了这样一个对象。

```
this.settings = {
    'views': 'views', // 模板目录
    'view engine': 'html'
}
```

而`app.engine`则是维护了一个`engines`对象。这部分逻辑非常简单，直接上代码。

```diff
function Application() {
    this.settings = {};
+   this.engines = {};
}
Application.prototype.engine = function (ext, fn) {
    var extension = ext[0] !== '.'
        ? '.' + ext
        : ext;
    this.engines[extension] = fn;
    return this;
};
```

到此，预备工作已经完成了，接下来重点看一下`res.render`的实现原理。

```
res.render = function (view, options, callback) {
    let done = callback;
    let opt = options || {};
    let req = this.req;
    let self = this;
    let app = this.req.app;
    // 允许只有两个参数(view,callback)
    if (typeof options === 'function') {
        done = options;
        opt = {}
    }
    done = done || function (err, str) {
        if (err) return req.next(err);
        self.send(str);
    }

    // 渲染
    app.render(view, opts, done);
}
```

渲染函数一共有三个参数，view 表示模板的名称，options 是模板渲染的变量，callback 是渲染成功后的回调函数。

函数内部直接调用 render 函数进行渲染，渲染完成后调用 done 回调。

接下来创建一个 view.js 文件，主要功能是负责各种模板引擎和框架间的隔离，保持对内接口的统一性。View 类内部定义了很多属性，主要包括引擎、根目录、扩展名、文件名等等，为了以后的渲染做准备。在调用实例的 render 方法时，就是一开始注册的引擎渲染函数渲染模板即可。其中渲染模板可以通过“渲染根目录+文件+后缀”获取。

```
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
```

最后我们实现以下`app.render`，在其中实例化一个`view`并且调用`view`的`render`方法。

```
Application.prototype.render = function (name, options, callback) {
    let done = callback;
    let engines = this.engines;
    // let opts = options;

    let view = new View(name, {
        defaultEngine: this.get('view engine'),
        root: this.get('views'),
        engines: engines
    });

    if (!view.path) {
        let err = new Error(`Failed to lookup view "${name}"`)
        return done(err);
    }
    try {
        view.render(options, callback);
    } catch (e) {
        return done(e);
    }

}
```

到此，一切搞定，我们用 demo 测试一下。 具体代码见具体结构代码可见分支：[step5](https://github.com/JeasonSun/mini-express/tree/step5)

### 总结

至此，本篇文章总算完了，其实计划还要写一下`body-parser`、`multer`等中间件的，不过篇幅太长，就不一一介绍了，后续会在代码中补充。本篇文章的主要目标已经实现，基本捋清了 Express 的基本结果，对路由和中间件的有了一个深刻的了解，明确了 Express 处理请求的逻辑流程，相信对后续阅读源码有很大的启发作用。

### 参考文档

1. [珠峰培训](http://www.zhufengpeixun.cn/public/courseExpress.html)
2. [express 源码阅读](https://juejin.im/post/59c0ef425188257e934966ad#heading-8)
3. [Express：模板引擎深入研究](https://www.cnblogs.com/chyingp/p/express-render-engine.html)