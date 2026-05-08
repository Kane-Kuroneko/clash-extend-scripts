# VPN Subscription Server

提供类似 VPN 供应商的订阅获取/更新服务，将原始订阅链接经过 Clash Auto-Routing 处理后返回。

## 功能特性

- ✅ 支持多种协议解析（Hysteria2、VLESS、Trojan）
- ✅ 自动应用 Clash Verge Rev 的 Auto-Routing 规则
- ✅ 输出标准 Clash 订阅格式（Base64 编码）
- ✅ 零缓存，每次请求实时处理

## 使用方法

### 1. 安装依赖

```bash
# 在主项目根目录安装依赖
cd Z:\parser
npm install

# 在 vpn-server 目录安装依赖
cd vpn-server
npm install
```

### 2. 启动服务

```bash
# 基本用法
npm start -- "<原始订阅链接>" [端口]

# 示例
npm start -- "https://example.com/subscribe?token=xxx" 6000
```

### 3. 在 Clash 中使用

将服务地址填入 Clash 订阅框：

```
http://localhost:6000/
```

## 工作流程

```
原始订阅链接 (Base64)
    ↓
Base64 解码 → 节点 URL 列表
    ↓
协议解析 → Clash 格式 proxies
    ↓
Auto-Routing 处理 → proxy-groups + rules
    ↓
YAML 序列化 → Base64 编码
    ↓
HTTP 响应 (Clash 订阅格式)
```

## 支持的协议

- **Hysteria2 / HY2**: 完整支持，包括 obfs、sni、skip-cert-verify
- **VLESS**: 支持 Reality、TLS、flow 等配置
- **Trojan**: 标准 Trojan 协议

## 技术架构

```
vpn-server/
├── server.ts              # HTTP 服务器主文件
├── yaml-wrapper.ts        # YAML 库包装
├── package.json           # 项目配置
└── tsconfig.json          # TypeScript 配置
```

### 核心依赖

- **AutoRoutingGroup**: 来自 `../src/AutoRoutingConfig.ts`
- **YAML**: 来自 `yaml` 库
- **HTTP**: Node.js 内置 http 模块

## 开发模式

```bash
# 启用热重载
npm run dev -- "<原始订阅链接>" [端口]
```

## 注意事项

1. **首次运行**: 确保主项目已安装依赖 (`npm install`)
2. **规则数据**: Auto-Routing 模式需要编译时规则，首次使用需运行 `npm run build:cvr:auto`
3. **节点兼容性**: 仅支持 Hysteria2、VLESS、Trojan 协议，其他协议会被跳过
4. **性能**: 无缓存机制，每次请求都会重新获取和处理订阅

## 示例输出

服务启动后会显示：

```
📡 原始订阅链接: https://example.com/subscribe?token=xxx
🔧 处理模式: cvr/auto-routing
🌐 服务端口: 6000

✅ 服务已启动: http://localhost:6000
📋 Clash 订阅链接: http://localhost:6000/

⏳ 等待请求...
```

收到请求时的日志：

```
[2026-04-27T12:00:00.000Z] 收到订阅请求
⬇️  正在获取原始订阅...
🔓 正在解码 Base64...
✅ 解析到 50 个节点
🔄 正在转换节点格式...
✅ 成功转换 48 个节点
⚙️  正在应用 Auto-Routing 规则...
📝 正在生成 YAML 配置...
🔒 正在 Base64 编码...
✅ 订阅处理完成并返回
```
