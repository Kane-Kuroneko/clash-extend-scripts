#!/bin/bash

# VPN Subscription Server 快速启动脚本

echo "🚀 VPN Subscription Server"
echo "=========================="
echo ""

# 端口参数（可选，默认 3456）
PORT="${1:-3456}"

echo "🔧 处理模式: cvr/auto-routing"
echo "🌐 服务端口: $PORT"
echo ""

# 检查主项目依赖
if [ ! -d "../../node_modules" ]; then
    echo "📦 安装主项目依赖..."
    cd ../..
    npm install
    cd VPN-Servers/NCR-AutoClash-Server
fi

# 检查 NCR-AutoClash-Server 依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装 NCR-AutoClash-Server 依赖..."
    npm install
fi

# 检查编译后的文件是否存在
if [ ! -f "../../dist/cvr/auto-routing.js" ]; then
    echo "🔨 编译 CVR Auto-Routing 脚本..."
    cd ../..
    npm run build:cvr:auto
    cd VPN-Servers/NCR-AutoClash-Server
fi

echo ""
echo "✅ 准备就绪，启动服务..."
echo ""

# 启动服务
npx tsx ./server.ts "$PORT"
