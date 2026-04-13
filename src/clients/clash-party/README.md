# Clash Party 覆写脚本

官方文档: https://clashparty.org/docs/guide/override/javascript

用于 Clash Party (Mihomo Party) 的配置覆写脚本，支持全局代理和自动路由两种模式。

## 快速使用

### 1. 编译脚本

```bash
# 全局代理模式
npm run build:party:global

# 自动路由模式
npm run build:party:auto
```

### 2. 在 Clash Party 中使用

1. 将 `dist/clash-party/` 下的 JS 文件部署到可访问的 URL
2. 在 Clash Party 中导入脚本：
   - 打开"覆写"页面
   - 粘贴脚本链接并导入
   - 在订阅管理中选择需要覆写的订阅
   - 选择导入的覆写脚本并保存

## 架构说明

脚本采用适配器模式，通过 `ClashPartyAdapter` 集成 `ConfigFactory` 来生成配置：

- `main.ts` - 入口文件，导出 `main` 函数供 Clash Party 调用
- `ClashPartyAdapter` - 适配器，处理 Clash Party 特有的配置格式
- `ConfigFactory` - 配置工厂，根据分流模式生成对应配置

## 类型定义

### ClashPartyConfig

扩展自基础 Clash 配置，增加以下字段：

```typescript
interface ClashPartyConfig {
  'proxy-providers'?: Record<string, ProxyProvider>;
  'rule-providers'?: Record<string, RuleProvider>;
  'script'?: {
    code?: string;
    shortcuts?: Record<string, string>;
  };
}
```

## 自定义开发

如需自定义配置逻辑，可修改 `ConfigFactory` 中的配置生成策略。当前支持：

- `global-proxy` - 全局代理模式
- `auto-routing` - 自动路由模式

## 注意事项

1. 脚本必须导出 `main` 函数
2. 修改配置时直接操作传入的 `config` 对象
3. 使用 TypeScript 开发可获得完整的类型提示
