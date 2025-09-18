#!/bin/bash

# Banana Flow 项目启动脚本
# 作者: AI Assistant
# 日期: $(date +%Y-%m-%d)

echo "🚀 启动 Banana Flow 项目..."
echo "📁 项目目录: $(pwd)"
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    echo "   当前目录: $(pwd)"
    echo "   请运行: cd /Users/temurlee/Cursor/Banana_Folw"
    exit 1
fi

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js"
    echo "   请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到 npm"
    echo "   请先安装 npm"
    exit 1
fi

echo "✅ 环境检查通过"
echo ""

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
    echo "✅ 依赖安装完成"
    echo ""
fi

# 检查 .env.local 文件
if [ ! -f ".env.local" ]; then
    echo "⚠️  警告: 未找到 .env.local 文件"
    echo "   请创建 .env.local 并添加您的 GEMINI_API_KEY"
    echo "   示例: echo 'GEMINI_API_KEY=your_api_key_here' > .env.local"
    echo ""
fi

# 提供启动选项
echo "请选择启动模式:"
echo "1) 仅启动前端 (npm run dev)"
echo "2) 启动完整服务 (前端 + 后端图片处理)"
echo "3) 仅启动后端图片处理服务"
echo "4) 退出"
echo ""

read -p "请输入选项 (1-4): " choice

case $choice in
    1)
        echo "🎨 启动前端开发服务器..."
        echo "🌐 访问地址: http://localhost:5173/"
        echo "⏹️  按 Ctrl+C 停止服务"
        echo ""
        npm run dev
        ;;
    2)
        echo "🎨 启动完整服务 (前端 + 后端)..."
        echo "🌐 前端地址: http://localhost:5173/"
        echo "🖼️  后端地址: http://localhost:3001/"
        echo "⏹️  按 Ctrl+C 停止服务"
        echo ""
        npm run dev:full
        ;;
    3)
        echo "🖼️  启动后端图片处理服务..."
        echo "🌐 服务地址: http://localhost:3001/"
        echo "⏹️  按 Ctrl+C 停止服务"
        echo ""
        npm run server
        ;;
    4)
        echo "👋 再见!"
        exit 0
        ;;
    *)
        echo "❌ 无效选项，请重新运行脚本"
        exit 1
        ;;
esac
