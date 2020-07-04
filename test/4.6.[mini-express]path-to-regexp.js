// 1. 了解需要转换目标正则的模型
let requestUrl = '/info/1/2';
let reg = new RegExp('/info/([^/]+)/([^/]+)');
let result = requestUrl.match(reg);
console.log(result);
/**
 *  输出result如下：
 * [
 *    '/info/1/2',
 *    '1',
 *    '2',
 *    index: 0,
 *    input: '/info/1/2',
 *    groups: undefined
 * ]
*/

// 2.将路由规则转化成正则
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

