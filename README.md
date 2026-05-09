# Clash/Mihomo 配置生成器

一个强大的 Clash/Mihomo 配置文件自动生成工具，支持多种客户端和智能分流规则。

## ✨ 功能特性

- 🎯 **多种客户端支持**: Clash for Windows、Clash Verge、Clash Party (Mihomo Party)
- 🔄 **两种分流模式**: 全局代理模式 & 智能自动路由模式
- 📝 **用户自定义规则**: 支持 Proxifier 风格的三维规则（进程 × 域名 × 端口）
- 🌐 **自动规则更新**: 基于 Loyalsoldier/clash-rules 的实时规则源
- ✅ **完整测试覆盖**: 108+ 测试用例确保稳定性

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 构建配置

```bash
# 构建所有客户端和模式
npm run build:all

# 构建特定客户端和模式
npm run build:cfw:global        # Clash for Windows - 全局代理
npm run build:cfw:auto          # Clash for Windows - 自动路由
npm run build:cvr:global        # Clash Verge - 全局代理
npm run build:cvr:auto          # Clash Verge - 自动路由
npm run build:party:global      # Clash Party - 全局代理
npm run build:party:auto        # Clash Party - 自动路由
```

### 使用自定义规则

```bash
# 编辑自定义规则文件
# custom-rules-config/user-rules.ts

# 使用自定义规则构建
npm run build:cvr:auto:custom
```

## 📖 使用说明

### 全局代理模式 (Global Proxy)
- 创建简单的代理分组
- 适合只需要基本分流策略的用户
- 规则：GEOIP,CN → 直连，MATCH → 代理

### 自动路由模式 (Auto Routing)
- 12+ 预设代理组（GFW、国外媒体、Telegram、AI、Microsoft 等）
- 自动从 GitHub 获取最新规则
- 智能筛选和去重
- 适合需要精细分流的进阶用户

### 自定义三维规则

在 `custom-rules-config/user-rules.ts` 中配置：

```typescript
{
  process: 'chrome.exe',           // 进程名
  hosts: [
    { type: 'DOMAIN-SUFFIX', value: 'google.com' }
  ],
  ports: [80, 443],               // 可选端口
  group: '🫧 Proxy A 🫧',          // 代理组
  description: 'Chrome 访问 Google'
}
```

详细文档：[docs/USER_CUSTOM_RULES_3D.md](docs/USER_CUSTOM_RULES_3D.md)

## 🧪 测试

```bash
# 运行所有测试
npm test

# 仅运行单元测试
npm run test:unit

# 仅运行集成测试
npm run test:integration

# 构建 + 测试
npm run test:all
```

## 📁 项目结构

```
├── src/                          # 源代码
│   ├── clients/                  # 客户端入口
│   ├── adapters/                 # 客户端适配器
│   ├── config/                   # 配置生成器
│   └── types/                    # 类型定义
├── custom-rules-config/          # 用户自定义规则
├── dist/                         # 构建产物
├── tests/                        # 测试文件
└── VPN-Servers/                  # 订阅转换服务器
```

## 🔧 技术栈

- **TypeScript** - 类型安全
- **Webpack** - 构建工具
- **Node.js Test** - 测试框架
- **YAML** - 配置解析

## 📄 许可证

MIT

## 💡 提示

- 构建产物位于 `dist/` 目录，可直接导入 Clash 客户端使用
- 自动路由模式首次构建可能需要更长时间（需下载规则数据）
- 自定义规则支持热更新，修改后重新构建即可生效
