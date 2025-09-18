@echo off
chcp 65001 >nul
echo 🚀 启动 Banana Flow 项目...
echo.

cd /d "%~dp0"

if not exist "package.json" (
    echo ❌ 错误: 请在项目根目录运行此脚本
    pause
    exit /b 1
)

echo ✅ 环境检查通过
echo.

if not exist "node_modules" (
    echo 📦 安装依赖...
    npm install
    if errorlevel 1 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
    echo.
)

if not exist ".env.local" (
    echo ⚠️  警告: 未找到 .env.local 文件
    echo    请创建 .env.local 并添加您的 GEMINI_API_KEY
    echo    示例: echo GEMINI_API_KEY=your_api_key_here > .env.local
    echo.
)

echo 请选择启动模式:
echo 1) 仅启动前端 (npm run dev)
echo 2) 启动完整服务 (前端 + 后端图片处理)
echo 3) 仅启动后端图片处理服务
echo 4) 退出
echo.

set /p choice="请输入选项 (1-4): "

if "%choice%"=="1" (
    echo 🎨 启动前端开发服务器...
    echo 🌐 访问地址: http://localhost:5173/
    echo ⏹️  按 Ctrl+C 停止服务
    echo.
    npm run dev
) else if "%choice%"=="2" (
    echo 🎨 启动完整服务 (前端 + 后端)...
    echo 🌐 前端地址: http://localhost:5173/
    echo 🖼️  后端地址: http://localhost:3001/
    echo ⏹️  按 Ctrl+C 停止服务
    echo.
    npm run dev:full
) else if "%choice%"=="3" (
    echo 🖼️  启动后端图片处理服务...
    echo 🌐 服务地址: http://localhost:3001/
    echo ⏹️  按 Ctrl+C 停止服务
    echo.
    npm run server
) else if "%choice%"=="4" (
    echo 👋 再见!
    exit /b 0
) else (
    echo ❌ 无效选项，请重新运行脚本
    pause
    exit /b 1
)

pause
