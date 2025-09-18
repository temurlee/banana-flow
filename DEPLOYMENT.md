# Banana Flow 本地部署指南

## 🚀 快速启动

### 1. 环境要求
- Node.js 18+ 
- npm 或 yarn
- Gemini API 密钥

### 2. 安装依赖
```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd server
npm install
cd ..
```

### 3. 配置环境变量
创建 `.env.local` 文件：
```bash
echo "GEMINI_API_KEY=your_gemini_api_key_here" > .env.local
```

### 4. 启动应用
```bash
# 同时启动前端和后端
npm run dev:full

# 或者分别启动
npm run dev      # 只启动前端
npm run server   # 只启动后端
```

### 5. 访问应用
- 前端：http://localhost:5173/
- 后端API：http://localhost:3001/

## 🔧 故障排除

### 端口被占用
如果端口5173被占用，Vite会自动选择下一个可用端口（5174、5175等）

### 样式问题
确保 `index.css` 文件存在，包含Tailwind CSS配置

### API密钥问题
检查 `.env.local` 文件中的 `GEMINI_API_KEY` 是否正确配置

## 📁 项目结构
```
├── components/          # React组件
├── services/           # API服务
├── server/             # 后端服务器
├── lib/                # 工具函数
├── index.css           # 样式文件
├── .env.local          # 环境变量
└── package.json        # 项目配置
```

## 🎯 功能特性
- 🎨 拖拽式节点编辑器界面
- 🤖 集成Gemini AI进行智能图像分析
- 📁 文件上传和处理功能
- 🔄 实时工作流执行
- 📱 响应式设计
- 🎬 AI视频生成
- 📝 智能文本生成

## 🛠️ 开发命令
```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run preview      # 预览构建结果
npm run server       # 启动后端服务器
npm run dev:full     # 同时启动前后端
```
