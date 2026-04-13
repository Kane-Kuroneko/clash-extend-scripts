# 重构说明

## 架构概述

本次重构实现了**客户端与分流配置的完全解耦**，支持任意组合：

### 客户端类型 (Client)
- `cfw`: Clash for Windows
- `cvr`: Clash Verge Rev

### 分流模式 (Mode)
- `global-proxy`: 全局代理模式（仅 GEOIP,CN + MATCH 两条规则）
- `auto-routing`: 自动路由模式（完整的 DuangCloud 分流规则）

## 构建命令

```bash
# CVR + 全局代理
npm run build cvr global-proxy

# CVR + 自动路由
npm run build cvr auto-routing

# CFW + 全局代理
npm run build cfw global-proxy

# CFW + 自动路由
npm run build cfw auto-routing

# 开发模式（监听文件变化）
npm run build cvr global-proxy --watch
```

**注意**：
- 参数顺序无关：`npm run build cvr global-proxy` 和 `npm run build global-proxy cvr` 等效
- 不需要 `--` 前缀

## 输出文件

构建产物位于 `dist/` 目录：

```
dist/
├── clash-for-windows/
│   ├── global-proxy.js
│   └── auto-routing.js
└── clash-verge/
    ├── global-proxy.js
    └── auto-routing.js
```

## 架构设计

### 核心模块

```
src/
├── config/                      # 配置生成器
│   ├── RoutingConfig.ts        # 路由配置基类（抽象类）
│   ├── GlobalRestrictedGroup.ts # 全局代理模式实现
│   └── ConfigFactory.ts        # 配置工厂（根据模式创建实例）
│
├── adapters/                    # 客户端适配器
│   ├── ClientAdapter.ts        # 客户端适配器基类（抽象类）
│   ├── CFWAdapter.ts           # CFW 客户端实现
│   └── CVRAdapter.ts           # CVR 客户端实现
│
├── types/                       # 模块化类型声明
│   ├── clash.d.ts              # Clash 核心类型
│   ├── client.d.ts             # 客户端运行时类型
│   ├── build.d.ts              # 构建配置类型
│   └── global.d.ts             # 全局类型声明
│
├── Duang.ts                     # AutoRoutingGroup（完整分流规则）
├── Clash.ts                     # Clash 基类
└── utils.ts                     # 工具函数
```

### 设计模式

1. **工厂模式**: `ConfigFactory` 根据 `mode` 参数创建对应的配置实例
2. **适配器模式**: `ClientAdapter` 处理不同客户端的 API 差异
3. **策略模式**: `GlobalRestrictedGroup` 和 `AutoRoutingGroup` 实现不同的分流策略
4. **依赖注入**: 运行时依赖（axios, yaml, console）通过构造函数注入

## 关键特性

### 1. 构建时参数注入

通过 Webpack 的 `DefinePlugin` 在构建时注入分流模式：

```typescript
// webpack.base.ts
plugins: [
  new DefinePlugin({
    __ROUTING_MODE__: JSON.stringify(args.mode),
  })
]

// cfw-script.ts / script.ts
const adapter = new CFWAdapter(__ROUTING_MODE__);
```

### 2. 参数验证

构建时自动验证参数合法性：

```bash
# 缺少参数会报错
$ npm run build
错误: 必须指定 client 和 mode 参数
用法: npm run build <cfw|cvr> <global-proxy|auto-routing>
示例: npm run build cvr global-proxy

# 无效参数会报错
$ npm run build invalid global-proxy
错误: 必须指定 client 和 mode 参数
```

### 3. 类型安全

- 模块化的 TypeScript 类型声明
- 编译时类型检查
- 完整的接口定义

## 向后兼容

- 保留了旧的 `types.d.ts` 文件，引用新的模块化类型
- 保留了 `Duang.ts` 中的 `AutoRoutingGroup` 类（原 `DuangCloudConf`）
- 删除了废弃的 `generic-converter.ts`

## 测试建议

### 测试 CFW + auto-routing
```bash
npm run build cfw auto-routing
# 检查 dist/clash-for-windows/auto-routing.js 是否生成
```

### 测试 CVR + global-proxy
```bash
npm run build cvr global-proxy
# 检查 dist/clash-verge/global-proxy.js 是否生成
```

### 测试参数验证
```bash
# 应该报错
npm run build

# 应该报错
npm run build invalid global-proxy
```

### 测试参数顺序无关
```bash
# 这两个命令等效
npm run build cvr global-proxy
npm run build global-proxy cvr
```

## 注意事项

1. **不要在类中使用 `#private` 私有属性**：会导致 clash-verge 内存泄漏
2. **每次构建只生成一个文件**：根据传入的参数决定
3. **参数顺序无关**：`npm run build cvr global-proxy` 和 `npm run build global-proxy cvr` 等效
4. **使用位置参数**：不需要 `--` 前缀，直接传参即可
