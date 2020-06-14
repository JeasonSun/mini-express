## 从零开始实现一个简易Express框架

### 1.前言
Express是Node.js最流行的Web开发框架，相信很多Node.js初学者都是从Express实战开始的，它提供了丰富的HTTP工具，通过中间件和路由让程序的组织管理变得更加容易。常言道，学习不仅要知其然,还要使其所以然。作为开发者，我们需要学会使用Express框架，还需要深入其中原理，才能解决更多的问题。

这篇文章会通过需求迭代的方式，结合原生实例，不断完善Express功能，最终完成一个简易的Express的轮子。意在学习和理解Express的源码。本文的整体思路是参考珠峰架构的手写Express框架公开课。

代码链接： [https://github.com/JeasonSun/mini-express.git](https://github.com/JeasonSun/mini-express.git)

### 2.版本0.0.1 - 初始化框架结构
在开始仿制前，我们先下载一下源代码，这里以官方4.17.1为例，我们来看一下Express的主要目录结构（其中省略了一些扩展功能文件）。
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
从实例中`const app = express()`我们看到express导出的是一个function。我们追踪源码发现，在`express/index.js`文件中只有一句简单的`module.exports=require('./lib/express');`，而在`lib/express`中`exports = module.exports = createApplication;`，我们很容易推断出`createApplication`应该是一个function，而且返回的对象会有get和listen两个方法。实现如下：
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
因此，我们参考express的目录结构，搭建一个express实现目录和一个test实例测试目录。我们约定`test/[express]xxx.js`文件是原生的测试用例，`test/[mini-express]/xxx.js`是我们自己实现的mini-express的测试用例。然后在接下来的步骤中，一步一步完善具体功能。

具体结构代码可见分支：[step1](https://github.com/JeasonSun/mini-express/tree/step1)


