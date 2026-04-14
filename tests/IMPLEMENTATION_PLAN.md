# 测试实现方案

## 问题

构建产物执行后，`main` 函数在模块作用域中，不会自动挂载到 `globalThis`。

## 解决方案

有两个选择：

### 方案1：修改测试方法，使用子进程执行

```typescript
// 创建临时 JS 文件，执行后通过 stdout 返回结果
const tempFile = `
${buildCode}
const result = main(${JSON.stringify(testConfig)});
console.log(JSON.stringify(result));
`;

// 在子进程中执行
const { stdout } = execSync(`node -e "${tempFile}"`);
const result = JSON.parse(stdout);
```

**优点**：完全隔离，真实模拟 Clash 客户端环境
**缺点**：速度较慢，每次测试都要启动子进程

### 方案2：使用 vm 模块并正确注入所有依赖

需要解决 `require is not defined` 的问题，通过 vm.Module 或者在沙箱中正确实现 require 函数。

### 方案3（推荐）：直接测试，利用构建产物已经包含所有依赖的特性

由于 webpack 打包后的代码已经是自包含的，我们可以：
1. 使用 `new Function()` 执行
2. 从返回值或全局变量获取 main
3. 在同一个测试进程中调用

**关键**：构建产物最后一行是 `main=__webpack_exports__.main;`，而 `__webpack_exports__` 是通过 DefinePlugin 注入的。

## 我的建议

采用**方案1（子进程）**，因为：
1. ✅ 完全隔离，不会影响测试环境
2. ✅ 真实模拟 Clash 客户端加载脚本的过程
3. ✅ 可以测试 main 函数是否真的在顶层作用域
4. ⚠️ 速度稍慢，但对测试来说可接受

需要我按方案1重新实现吗？
