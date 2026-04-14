# Parser 项目测试文档

## 概述

本测试框架用于验证 parser 项目的构建产物和业务逻辑，确保：
1. 新增/修改的业务逻辑与最终产物运行在 clash 客户端的效果一致
2. 原有功能正常回归
3. CVR/Clash Party 环境中 main 函数在 top-level 正确存在

## 测试分类

### 1. 构建产物验证测试 (build-validation.test.ts)

验证所有构建产物是否正确生成：
- ✅ 文件存在性检查
- ✅ 构建产物内容验证（大小、webpack 特征）
- ✅ CVR 和 Clash Party 的 main 函数导出验证
- ✅ CFW 不使用 var main 导出验证
- ✅ 构建产物大小检查（auto-routing > global-proxy）

### 2. 业务逻辑测试 (business-logic.test.ts)

验证核心业务逻辑是否正确工作：
- ✅ Global Proxy 模式配置处理
- ✅ 代理组正确性验证
- ✅ 规则配置验证
- ✅ 原始代理列表保留
- ✅ Auto Routing 模式验证
- ✅ CVR 和 Clash Party 配置转换一致性
- ✅ 边界情况处理（空配置等）

### 3. Main 函数导出测试 (main-export.test.ts)

专门验证 CVR 和 Clash Party 环境中 main 函数是否在 top-level 存在：
- ✅ var main 声明存在性
- ✅ main 赋值语句正确性
- ✅ main 函数可调用性
- ✅ 严格模式兼容性
- ✅ 函数签名验证

## 使用方法

### 安装依赖

```bash
npm install
```

### 运行测试

#### 运行所有测试

```bash
npm test
```

#### 运行特定测试

```bash
# 仅运行构建验证测试
npm run test:build

# 仅运行业务逻辑测试
npm run test:logic

# 仅运行 main 函数导出测试
npm run test:main
```

#### 完整测试流程（构建 + 测试）

```bash
# 先构建所有产物，然后运行测试
npm run test:all
```

### 单独构建

```bash
# 构建所有客户端和模式
npm run build:all

# 构建特定客户端和模式
npm run build:cvr:global
npm run build:party:auto
npm run build:cfw:global
```

## 测试覆盖的客户端和模式

### 客户端
- **CFW** (Clash for Windows)
- **CVR** (Clash Verge)
- **Clash Party** (Mihomo Party)

### 模式
- **global-proxy**: 全局代理模式
- **auto-routing**: 自动路由模式

## 测试输出示例

```
=== Parser 项目测试套件 ===

运行测试: build-validation.test.ts
==================================================
▶ 构建产物验证
  ▶ 文件存在性检查
    ✔ cfw - global-proxy 构建产物应该存在
    ✔ cvr - global-proxy 构建产物应该存在
    ...
  ▶ CVR 和 Clash Party 的 main 函数导出
    ✔ cvr - global-proxy 应该包含 main 函数导出
    ...
▶ 构建产物验证 (passed)

✅ build-validation.test.ts 测试通过
...

✅ 所有测试通过!
```

## 回归测试工作流

当你完成代码修改后，建议按以下步骤进行回归测试：

### 1. 构建所有产物

```bash
npm run build:all
```

### 2. 运行完整测试

```bash
npm test
```

### 3. 验证特定功能

如果修改了特定客户端或模式的逻辑，可以单独测试：

```bash
# 仅构建和测试 CVR global-proxy
npm run build:cvr:global
npm run test:main  # 验证 main 函数导出

# 仅构建和测试 Clash Party auto-routing
npm run build:party:auto
npm run test:logic  # 验证业务逻辑
```

## 添加新测试

### 创建新测试文件

在 `tests/` 目录下创建 `*.test.ts` 文件：

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('新功能测试', () => {
	it('应该正确工作', () => {
		assert.ok(true, '测试通过');
	});
});
```

### 更新测试工具

如果需要在 `tests/test-utils.ts` 中添加辅助函数：

```typescript
export function myNewHelper() {
	// 辅助函数实现
}
```

### 注册到测试套件

在 `tests/run-all-tests.ts` 中添加新测试文件：

```typescript
const testFiles = [
	'build-validation.test.ts',
	'business-logic.test.ts',
	'main-export.test.ts',
	'your-new-test.test.ts'  // 添加这里
];
```

## 常见问题

### Q: 测试失败怎么办？

1. 检查构建是否成功：`npm run build:all`
2. 查看具体失败的测试用例输出
3. 检查 dist 目录中是否有对应的构建产物
4. 确认代码修改没有破坏现有逻辑

### Q: 如何调试测试？

使用 tsx 直接运行单个测试文件：

```bash
tsx --test tests/build-validation.test.ts
```

### Q: 沙箱环境执行失败？

某些测试使用 eval 在沙箱中执行构建产物。如果失败：
- 检查构建产物是否完整
- 确认没有语法错误
- 某些测试会 gracefully degrade，只记录警告

## 最佳实践

1. **每次修改代码后都运行测试**：确保没有破坏现有功能
2. **提交前运行完整测试**：`npm run test:all`
3. **添加新功能时编写对应测试**：保持测试覆盖率
4. **定期审查测试用例**：确保测试仍然有效

## 技术栈

- **测试框架**: Node.js 原生 test 模块
- **断言库**: Node.js 原生 assert 模块
- **运行时**: tsx (TypeScript 执行器)
- **构建工具**: Webpack

## 贡献

欢迎添加更多测试用例来覆盖边界情况和新增功能！
