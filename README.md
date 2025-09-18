<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Banana Flow - AI图像处理工作流应用

这是一个基于React和Vite构建的AI图像处理工作流应用，集成了Gemini AI和图像处理功能。

## 功能特性

- 🎨 拖拽式节点编辑器界面
- 🤖 集成Gemini AI进行智能图像分析
- 📁 文件上传和处理功能
- 🔄 实时工作流执行
- 📱 响应式设计

## 本地运行

**前置要求:** Node.js 18+

1. 安装依赖：
   ```bash
   npm install
   ```

2. 配置环境变量：
   - 创建 `.env.local` 文件
   - 添加您的Gemini API密钥：
     ```
     GEMINI_API_KEY=your_gemini_api_key_here
     ```

3. 启动开发服务器：
   ```bash
   npm run dev
   ```

4. 启动后端服务器（可选）：
   ```bash
   npm run server
   ```

5. 同时运行前端和后端：
   ```bash
   npm run dev:full
   ```

## 项目托管

项目已托管在GitHub上：
- **仓库地址**: https://github.com/temurlee/banana_flow
- **克隆项目**: `git clone https://github.com/temurlee/banana_flow.git`

## 项目结构

```
├── components/          # React组件
├── services/           # API服务
├── server/             # 后端服务器
├── lib/                # 工具函数
└── types.ts            # TypeScript类型定义
```

## 技术栈

- **前端**: React 19, TypeScript, Vite
- **UI**: Tailwind CSS, Radix UI, Framer Motion
- **后端**: Node.js, Express
- **AI**: Google Gemini API
- **版本控制**: Git, GitHub
