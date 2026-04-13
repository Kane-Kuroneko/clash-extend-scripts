# 客户端重构总结

## 重构概述

本次重构将 `clients` 目录下每个客户端的入口文件统一命名为 `main.ts`，并完善了 clash-party 的逻辑，使其与其他客户端保持一致的架构模式。

## 主要变更

### 1. 文件重命名

- ✅ `clash-for-windows/cfw-script.ts` → `clash-for-windows/main.ts`
- ✅ `clash-verge/script.ts` → `clash-verge/main.ts`
- ✅ `clash-party/script.ts` → `clash-party/main.ts`

### 2. 新增 ClashPartyAdapter 适配器

创建了 `src/adapters/ClashPartyAdapter.ts`，实现了与其他客户端一致的适配器模式：

- 继承自 `ClientAdapter` 基类
- 实现了 `main()` 方法，集成 `ConfigFactory`
- 支持两种分流模式：`global-proxy` 和 `auto-routing`
- 包含完整的 TypeScript 类型定义：
  - `ClashPartyConfig` - Clash Party 配置接口
  - `ProxyProvider` - 代理提供者配置
  - `RuleProvider` - 规则提供者配置
  - `ClashPartyProxyGroup` - 代理组配置

### 3. 完善 clash-party/main.ts 逻辑

新的 `main.ts` 文件：
- 使用 `ClashPartyAdapter` 适配器
- 通过 `__ROUTING_MODE__` 构建时常量注入分流模式
- 调用适配器的 `main()` 方法处理配置
- 集成了 `ConfigFactory` 以生成对应的分流配置

### 4. 更新构建配置

#### webpack.base.ts
- ✅ 添加 `clash-party` 到有效客户端列表
- ✅ 更新入口路径指向新的 `main.ts` 文件
- ✅ 支持三种客户端：`cfw`、`cvr`、`clash-party`

#### package.json
新增便捷的构建脚本：
```json
"build:cfw:global": "tsx ./webpack.base.ts cfw global-proxy",
"build:cfw:auto": "tsx ./webpack.base.ts cfw auto-routing",
"build:cvr:global": "tsx ./webpack.base.ts cvr global-proxy",
"build:cvr:auto": "tsx ./webpack.base.ts cvr auto-routing",
"build:party:global": "tsx ./webpack.base.ts clash-party global-proxy",
"build:party:auto": "tsx ./webpack.base.ts clash-party auto-routing"
```

### 5. 更新类型定义

#### src/types/build.d.ts
- 更新 `ClientType` 类型，添加 `'clash-party'`

#### src/types/global.d.ts
- 添加 `__ROUTING_MODE__` 全局常量声明

### 6. 更新文档

更新了 `src/clients/clash-party/README.md`：
- 反映新的文件结构
- 添加编译脚本说明
- 更新导入路径示例

## 架构优势

### 统一的适配器模式

现在所有客户端都遵循相同的架构模式：

```
客户端入口 (main.ts)
    ↓
适配器 (Adapter)
    ↓
配置工厂 (ConfigFactory)
    ↓
具体配置类 (GlobalRestrictedGroup / AutoRoutingGroup)
```

### 代码复用

- 共享 `ClientAdapter` 基类
- 共享 `ConfigFactory` 配置生成逻辑
- 共享类型定义系统

### 易于扩展

添加新客户端只需：
1. 创建新的适配器类（继承 `ClientAdapter`）
2. 创建 `main.ts` 入口文件
3. 在 `webpack.base.ts` 中添加配置
4. 在 `package.json` 中添加构建脚本

## 构建命令

### 通用构建命令
```bash
npm run build <client> <mode>
```

示例：
```bash
npm run build cfw global-proxy
npm run build cvr auto-routing
npm run build clash-party global-proxy
```

### 快捷构建命令
```bash
# Clash for Windows
npm run build:cfw:global
npm run build:cfw:auto

# Clash Verge
npm run build:cvr:global
npm run build:cvr:auto

# Clash Party
npm run build:party:global
npm run build:party:auto
```

## 输出文件

构建后的文件位于 `dist/` 目录：
```
dist/
├── cfw/
│   ├── global-proxy.js
│   └── auto-routing.js
├── cvr/
│   ├── global-proxy.js
│   └── auto-routing.js
└── clash-party/
    ├── global-proxy.js
    └── auto-routing.js
```

## 验证

所有代码已通过 TypeScript 编译检查，无错误。

## 向后兼容性

- ✅ 保留了原有的所有功能
- ✅ 适配器接口保持不变
- ✅ 构建参数完全兼容
- ✅ 类型定义向后兼容

## 后续建议

1. 可以考虑为 clash-party 添加更多特定的配置选项
2. 可以添加单元测试验证适配器逻辑
3. 可以考虑添加 CI/CD 自动构建流程
