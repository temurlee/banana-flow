# 🚀 Banana Flow 启动脚本说明

## 📁 脚本文件

### 1. `start.sh` - 完整启动脚本 (推荐)
- **功能**: 提供多种启动选项的交互式脚本
- **使用**: `./start.sh`
- **特点**: 
  - 自动检查环境
  - 自动安装依赖
  - 提供多种启动模式选择


### 2. `start.bat` - Windows 批处理脚本
- **功能**: Windows 系统的启动脚本
- **使用**: 双击 `start.bat` 或在命令行运行
- **特点**: 支持中文显示，提供多种启动选项

## 🎯 启动模式说明

### 模式 1: 仅启动前端
```bash
npm run dev
```
- **端口**: http://localhost:5173/
- **用途**: 日常开发，不需要图片处理功能

### 模式 2: 启动完整服务
```bash
npm run dev:full
```
- **前端**: http://localhost:5173/
- **后端**: http://localhost:3001/
- **用途**: 需要图片压缩、裁剪等完整功能

### 模式 3: 仅启动后端
```bash
npm run server
```
- **端口**: http://localhost:3001/
- **用途**: 仅提供图片处理 API 服务

## 🔧 使用方法

### macOS/Linux
```bash
# 方法1: 使用完整脚本
./start.sh

# 方法2: 直接使用 npm
npm run dev
```

### Windows
```bash
# 方法1: 双击 start.bat 文件

# 方法2: 在命令行运行
start.bat

# 方法3: 直接使用 npm
npm run dev
```

## ⚠️ 注意事项

1. **首次运行**: 脚本会自动安装依赖
2. **API 密钥**: 确保 `.env.local` 文件包含有效的 `GEMINI_API_KEY`
3. **端口占用**: 确保 5173 和 3001 端口未被占用
4. **权限问题**: 如果脚本无法执行，运行 `chmod +x *.sh`

## 🆘 故障排除

### 脚本无法执行
```bash
chmod +x start.sh quick-start.sh
```

### 端口被占用
```bash
# 查看端口占用
lsof -i :5173
lsof -i :3001

# 杀死占用进程
kill -9 <PID>
```

### 依赖安装失败
```bash
# 清除缓存重新安装
rm -rf node_modules package-lock.json
npm install
```

## 📞 支持

如果遇到问题，请检查：
1. Node.js 版本 (推荐 16+)
2. npm 版本 (推荐 8+)
3. 网络连接
4. 文件权限
