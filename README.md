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
详细配置见
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



### Dual Clash Arch Config

- ClashA Conf
	- 开启Tun模式
   - 使用auto-routing分流模式(js脚本或server)
   - bypass ClashB代理地址
   - 
   - 根据需要添加自定义分流
   - 
