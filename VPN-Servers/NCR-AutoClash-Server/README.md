# VPN Subscription Server

提供类似 VPN 供应商的订阅获取/更新服务，将原始订阅链接经过 Clash Auto-Routing 处理后返回。

## 功能特性

- ✅ 支持多种协议解析（Hysteria2、VLESS、Trojan）
- ✅ 自动应用 Clash Verge Rev 的 Auto-Routing 规则
- ✅ 输出标准 Clash 配置格式（YAML）
- ✅ 零缓存，每次请求实时处理

## 使用方法

### 1. 安装依赖

```bash
# 在主项目根目录安装依赖
cd Z:\parser
npm install

# 在 NCR-AutoClash-Server 目录安装依赖
cd VPN-Servers/NCR-AutoClash-Server
npm install
```

### 2. 启动服务

```bash
# 基本用法（默认端口 3456）
npm start

# 指定端口
npx tsx ./server.ts 8000
```

### 3. 在 Clash 中使用

将服务地址填入 Clash 订阅框，通过 `url` 参数指定原始订阅地址：

```
http://192.168.0.10:3456?url=<原始订阅地址>
```

> **提示**：将 `192.168.0.10` 替换为运行该服务的实际服务器 IP 地址。

**示例：**
```
http://192.168.0.10:3456?url=https://example.com/subscribe?token=xxx
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
YAML 序列化 → HTTP 响应
    ↓
HTTP 响应 (Clash 配置格式)
```

## 支持的协议

- **Hysteria2 / HY2**: 完整支持，包括 obfs、sni、skip-cert-verify
- **VLESS**: 支持 Reality、TLS、flow 等配置
- **Trojan**: 标准 Trojan 协议

## 技术架构

```
vpn-servers/NCR-AutoClash-Server/
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
# 启用热重载（默认端口 3456）
npm run dev

# 指定端口
npx tsx watch ./server.ts 8000
```

## 注意事项

1. **首次运行**: 确保主项目已安装依赖 (`npm install`)
2. **规则数据**: Auto-Routing 模式需要编译时规则，首次使用需运行 `npm run build:cvr:auto`
3. **节点兼容性**: 仅支持 Hysteria2、VLESS、Trojan 协议，其他协议会被跳过
4. **性能**: 无缓存机制，每次请求都会重新获取和处理订阅

## 示例输出

服务启动后会显示：

```
🔧 处理模式: cvr/auto-routing
🌐 服务端口: ${port}
📡 使用方式: http://<server-ip>:${port}?url=<原始订阅地址>

✅ 服务已启动: http://localhost:${port}
📋 使用示例: http://localhost:${port}?url=https://example.com/subscribe?token=xxx
🔒 监听地址: 0.0.0.0:${port}

⏳ 等待请求...
```

收到请求时的日志：

```
[2026-04-27T12:00:00.000Z] 收到订阅请求
📡 原始订阅链接: https://example.com/subscribe?token=xxx
⬇️  正在获取原始订阅...
📋 检测到 YAML 格式订阅
✅ 从 YAML 中提取到 50 个节点
⚙️  正在应用 Auto-Routing 规则...
📝 正在生成 YAML 配置...
✅ 订阅处理完成并返回
```
