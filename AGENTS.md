# Banana Flow - AI 图像处理应用

## 项目概述

Banana Flow 是一个基于 React + TypeScript + Vite 的 AI 图像处理应用，集成了 Google Gemini AI 服务和图像处理功能。

## 技术栈

- **前端**: React 19, TypeScript, Vite
- **样式**: Tailwind CSS, Radix UI
- **动画**: Framer Motion
- **后端**: Express.js, Sharp (图像处理)
- **AI 服务**: Google Gemini API
- **文件处理**: Multer

## 开发环境设置

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
# 仅前端
npm run dev

# 完整开发环境（前端 + 后端）
npm run dev:full
```

### 构建和预览
```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 项目结构

```
banana_flow/
├── components/          # React 组件
│   ├── ui/             # 基础 UI 组件
│   ├── Node.tsx        # 节点组件
│   ├── Edge.tsx        # 边组件
│   └── ...
├── services/           # 服务层
│   ├── geminiService.ts
│   ├── imageService.ts
│   └── replicateService.ts
├── server/             # 后端服务
│   └── imageProcessor.js
├── lib/                # 工具函数
└── types.ts            # TypeScript 类型定义
```

## 代码风格

### TypeScript 规范
- 使用严格模式
- 单引号，无分号
- 优先使用函数式组件
- 使用 interface 定义类型
- 避免 any 类型

### React 组件规范
- 使用函数式组件和 Hooks
- 组件名使用 PascalCase
- Props 使用 TypeScript 接口定义
- 使用 Framer Motion 进行动画

### 样式规范
- 使用 Tailwind CSS 类名
- 组件样式使用 className
- 响应式设计优先
- 使用 Radix UI 组件库

## 核心功能

### 图像处理
- 支持多种图像格式
- 使用 Sharp 进行服务器端处理
- 文件上传使用 Multer
- 临时文件自动清理

### AI 集成
- Google Gemini API 集成
- 图像分析和处理
- 智能内容生成

### 用户界面
- 拖拽式节点编辑器
- 实时预览
- 响应式设计
- 动画效果

## 开发指南

### 添加新组件
1. 在 `components/` 目录创建组件文件
2. 定义 TypeScript 接口
3. 使用 Tailwind CSS 样式
4. 导出组件

### 添加新服务
1. 在 `services/` 目录创建服务文件
2. 定义 API 接口
3. 处理错误和异常
4. 添加类型定义

### 后端开发
1. 在 `server/` 目录添加路由
2. 使用 Express.js 框架
3. 处理文件上传和图像处理
4. 添加适当的错误处理

## 测试

### 运行测试
```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- --grep "组件名"
```

### 测试规范
- 为每个组件编写测试
- 测试用户交互
- 测试 API 调用
- 测试错误处理

## 部署

### 环境变量
```bash
# .env 文件
GEMINI_API_KEY=your_api_key
PORT=3000
NODE_ENV=production
```

### 构建部署
```bash
# 构建前端
npm run build

# 启动后端服务
npm run server
```

## 性能优化

### 前端优化
- 使用 React.memo 优化重渲染
- 懒加载组件
- 图片优化和压缩
- 代码分割

### 后端优化
- 图像处理缓存
- 文件大小限制
- 内存管理
- 错误处理

## 调试

### 常用调试命令
```bash
# 检查端口占用
lsof -i :5173  # Vite 开发服务器
lsof -i :3000  # Express 服务器

# 查看日志
npm run dev:full 2>&1 | tee debug.log
```

### 调试技巧
- 使用 React DevTools
- 检查网络请求
- 查看控制台错误
- 使用断点调试

## 常见问题

### 图像上传失败
- 检查文件大小限制
- 验证文件类型
- 检查 Multer 配置

### AI 服务错误
- 验证 API 密钥
- 检查网络连接
- 查看服务日志

### 构建错误
- 检查 TypeScript 类型错误
- 验证依赖版本
- 清理 node_modules 重新安装
