# 开箱即用的Clash系(Mihomo) 配置生成器

为不想折腾规则的用户提供最易用的Clash规则和分组
也为极客用户提供了多种进阶选项

## 能做哪些事

### 订阅规则转化(服务端模式)
如果你嫌机场自带的分组或分流规则不好用,clash客户端又不支持js脚本定制规则,可以直接在电脑上启动服务
1. `npm start`
2. 查看控制台中输出地址,比如`192.168.1.1:3456`
3. 在手机的clash系客户端(任何局域网客户端皆可)上添加新的订阅,填入`http://192.168.1.1:3456?url=<你的机场订阅地址>`;例:`http://192.168.1.1:3456?url=https://isp.yours.org/api/client/123456`
4. 等待手机端订阅完成  

效果展示(左边是未转换前):

<img src="https://pica.zhimg.com/100/v2-a0d77fefb679f17a0fa19089142b6254_r.jpg" width="45%" style="margin-right: 5%;" />
<img src="https://pic1.zhimg.com/100/v2-209496f435d0fced848cc39fc7f69f3c_r.jpg" width="45%" />  

### 进阶用法
选择规则模式,支持:
- `npm start auto-routing`:智能分流模式(默认),适用于绝大部分单clash客户端使用场景
- `npm start global-proxy`:全局代理模式,仅跳过大陆GEOIP,其他流量一律走ProxyA。适用于双clash客户端架构。

## 双clash客户端架构  
单clash客户端翻墙时会有这样的困扰：
- 分流不能覆盖所有域名、关键字。如果不小心直连了敏感机构服务(比如claude code)则会引起严重后果,所以应该在claude app内部设置指定的全局proxy server,而不能依赖自动分流
- 某些App不支持系统代理,或默认不走系统代理
- 提供一条"全局代理"的proxy server

于是Dual Clash Arch应运而生:
- Clash A:开启Tun模式,使用auto-routing自动分流模式接管系统所有流量,,但bypass 127.0.0.1:xxxx的流量
- Clash B:不开启Tun和系统代理,使用global-proxy全局分流模式,仅设置并后台运行127.0.0.1:xxxx的服务器  

### 架构原理
**为什么需要双Clash架构？**

1. **安全兜底**：单客户端自动分流存在漏网之鱼的风险，一旦敏感域名被错误直连可能造成严重后果。双架构提供"全局代理"作为安全兜底
2. **应用兼容性**：某些应用不走系统代理或 hardcoded 直连，需要通过独立代理实例处理
3. **职责分离**：
   - Clash A 负责智能分流（国内直连、国外代理）
   - Clash B 负责全局代理（为特定应用提供固定代理入口）

### 配置步骤

#### 1. 准备 Clash B（全局代理实例）

```bash
# 构建全局代理模式配置
npm run build:cvr:global  # 或其他客户端
```

**Clash B 配置要点：**
- ❌ **不开启 TUN 模式**
- ❌ **不设置系统代理**
- ✅ 监听本地端口（如 `127.0.0.1:7890`）
- ✅ 使用 `global-proxy` 模式（仅 GEOIP,CN 直连，其余全部代理）
- ✅ 后台静默运行

```yaml
# Clash B 配置示例
mixed-port: 7890
allow-lan: false
mode: Rule
log-level: info

tun:
  enable: false  # 关键：不开启TUN

proxy-groups:
  - name: "🫧 Global Proxy 🫧"
    type: select
    proxies:
      - 你的代理节点1
      - 你的代理节点2

rules:
  - GEOIP,CN,❄️ China Geo-IP ❄️
  - MATCH,🫧 Global Proxy 🫧
```

#### 2. 准备 Clash A（智能分流实例）

```bash
# 构建自动路由模式配置
npm run build:cvr:auto  # 或其他客户端
```

**Clash A 配置要点：**
- ✅ **开启 TUN 模式**（接管系统所有流量）
- ✅ **设置系统代理**
- ✅ 使用 `auto-routing` 模式（12+ 智能分组）
- ✅ **Bypass Clash B 地址**（避免递归代理）

```yaml
# Clash A 配置示例
mixed-port: 7891  # 使用不同端口
allow-lan: true
mode: Rule
log-level: info

tun:
  enable: true  # 关键：开启TUN
  stack: mixed
  dns-hijack:
    - any:53

# 关键：添加绕过规则
rules:
  # 最高优先级：绕过 Clash B 的地址
  - IP-CIDR,127.0.0.1/32,DIRECT
  - IP-CIDR,127.0.0.0/8,DIRECT
  
  # 其他自动分流规则...
  - DOMAIN-SUFFIX,google.com,🫧 Proxy A 🫧
  - GEOIP,CN,🟢 China Direct
  - MATCH,🐟 Final
```

#### 3. 应用配置

在需要全局代理的应用中（如 Claude Desktop、Telegram 等）：
- 设置代理服务器为 `http://127.0.0.1:7890`（Clash B 的监听地址）
- 这些应用的流量将强制走全局代理，不受 Clash A 分流规则影响

### 流量路径示意

```
[应用程序]
    ↓
    ├─> 应用内置代理 → 127.0.0.1:7890 (Clash B) → 全局代理 → 互联网
    │
    └─> 系统代理 → TUN (Clash A) → 智能分流
                              ├─ 国内流量 → DIRECT
                              ├─ GFW站点 → Proxy A
                              ├─ 国外媒体 → Foreign Media
                              └─ 漏网之鱼 → Final
```

### 注意事项

1. **端口冲突**：Clash A 和 Clash B 必须使用不同端口
2. **Bypass 规则**：Clash A 必须绕过 Clash B 的监听地址，否则会形成递归代理
3. **性能开销**：双实例会占用更多内存（约 2x），但现代设备通常无压力
4. **维护成本**：需要同时管理两个配置文件和更新订阅

详细配置示例见：[proxifier-to-mihomo.yaml](proxifier-to-mihomo.yaml)
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
