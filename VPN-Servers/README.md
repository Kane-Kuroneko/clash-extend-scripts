# VPN Servers Workspace

VPN 服务器 Monorepo Workspace。

## 📁 目录结构

```
VPN-Servers/
├── NCR-AutoClash-Server/    # 机场订阅URL → Clash Auto-Routing 转换服务
│   ├── server.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── README.md
│   ├── QUICKSTART.md
│   └── start.sh
```

## 🚀 快速启动

### 安装依赖

```bash
cd VPN-Servers
npm run install:all
```

### 启动 NCR-AutoClash-Server

```bash
# 启动服务
npm run start:ncr

# 开发模式（热重载）
npm run dev:ncr
```

## 📖 详细说明

- **[NCR-AutoClash-Server 文档](NCR-AutoClash-Server/README.md)** - 将机场订阅URL经过Clash Auto-Routing处理后返回
