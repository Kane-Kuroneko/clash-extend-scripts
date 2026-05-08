#!/bin/bash

# VPN Subscription Server 快速启动脚本

echo "🚀 VPN Subscription Server"
echo "=========================="
echo ""

# 检查是否提供了订阅链接
if [ -z "$1" ]; then
    echo "❌ 错误: 必须提供原始 VPN 订阅链接"
    echo ""
    echo "用法: ./start.sh <orig-vpn-url> [port]"
    echo "示例: ./start.sh \"https://example.com/subscribe?token=xxx\" 6000"
    exit 1
fi

ORIG_VPN_URL="$1"
PORT="${2:-6000}"

echo "📡 原始订阅链接: $ORIG_VPN_URL"
echo "🌐 服务端口: $PORT"
echo ""

# 检查主项目依赖
if [ ! -d "../node_modules" ]; then
    echo "📦 安装主项目依赖..."
    cd ..
    npm install
    cd vpn-server
fi

# 检查 vpn-server 依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装 VPN Server 依赖..."
    npm install
fi

# 检查编译后的文件是否存在
if [ ! -f "../dist/cvr/auto-routing.js" ]; then
    echo "🔨 编译 CVR Auto-Routing 脚本..."
    cd ..
    npm run build:cvr:auto
    cd vpn-server
fi

echo ""
echo "✅ 准备就绪，启动服务..."
echo ""

# 启动服务
npx tsx ./server.ts "$ORIG_VPN_URL" "$PORT"
