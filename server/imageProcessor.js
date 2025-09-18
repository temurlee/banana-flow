import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 确保temp目录存在
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// 配置multer用于文件上传
const upload = multer({ 
  dest: tempDir,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB限制
});

// 图片处理API
app.post('/api/process-image', upload.single('image'), async (req, res) => {
  try {
    const { format, quality, cropData } = req.body;
    const inputPath = req.file.path;
    
    console.log('Processing image:', {
      format,
      quality,
      cropData: cropData ? 'provided' : 'none',
      fileSize: req.file.size
    });
    
    // 解析裁剪数据
    const crop = cropData ? JSON.parse(cropData) : null;
    
    // 获取图片元数据以进行边界检查
    const metadata = await sharp(inputPath).metadata();
    
    // 使用Sharp处理图片
    let processor = sharp(inputPath);
    
    // 应用裁剪（带边界检查）
    if (crop && crop.width > 0 && crop.height > 0) {
      // 确保裁剪区域在图片边界内
      const left = Math.max(0, Math.min(Math.round(crop.x), metadata.width - 1));
      const top = Math.max(0, Math.min(Math.round(crop.y), metadata.height - 1));
      const width = Math.min(Math.round(crop.width), metadata.width - left);
      const height = Math.min(Math.round(crop.height), metadata.height - top);
      
      console.log('Crop validation:', {
        original: { x: crop.x, y: crop.y, width: crop.width, height: crop.height },
        image: { width: metadata.width, height: metadata.height },
        adjusted: { left, top, width, height },
        hasTargetDimensions: !!(crop.targetWidth && crop.targetHeight)
      });
      
      if (width > 0 && height > 0) {
        processor = processor.extract({
          left,
          top,
          width,
          height
        });
      }
    }
    
    // 应用目标尺寸调整（如果有cropPrompt）
    if (crop && crop.targetWidth && crop.targetHeight) {
      console.log('Resizing to target dimensions:', {
        from: { width: crop.width, height: crop.height },
        to: { width: crop.targetWidth, height: crop.targetHeight }
      });
      
      processor = processor.resize({
        width: crop.targetWidth,
        height: crop.targetHeight,
        fit: 'cover', // 保持比例，裁剪多余部分
        position: 'center'
      });
    }
    
    // 设置输出格式和质量
    if (format === 'jpeg' || format === 'jpg') {
      processor = processor.jpeg({ 
        quality: parseInt(quality) || 85,
        progressive: true,
        mozjpeg: true // 更好的压缩
      });
    } else if (format === 'png') {
      if (metadata.hasAlpha) {
        // 有透明通道，使用PNG优化设置
        // 首先尝试调色板模式
        let paletteProcessor = sharp(inputPath);
        if (crop && crop.width > 0 && crop.height > 0) {
          const left = Math.max(0, Math.min(Math.round(crop.x), metadata.width - 1));
          const top = Math.max(0, Math.min(Math.round(crop.y), metadata.height - 1));
          const width = Math.min(Math.round(crop.width), metadata.width - left);
          const height = Math.min(Math.round(crop.height), metadata.height - top);
          
          if (width > 0 && height > 0) {
            paletteProcessor = paletteProcessor.extract({
              left,
              top,
              width,
              height
            });
          }
        }
        
        const paletteBuffer = await paletteProcessor.png({ 
          compressionLevel: 9,
          adaptiveFiltering: true,
          palette: true,
          quality: 100,
          effort: 10,
          colors: 128 // 减少颜色数量以获得更好的压缩
        }).toBuffer();
        
        // 然后尝试无损压缩
        let losslessProcessor = sharp(inputPath);
        if (crop && crop.width > 0 && crop.height > 0) {
          const left = Math.max(0, Math.min(Math.round(crop.x), metadata.width - 1));
          const top = Math.max(0, Math.min(Math.round(crop.y), metadata.height - 1));
          const width = Math.min(Math.round(crop.width), metadata.width - left);
          const height = Math.min(Math.round(crop.height), metadata.height - top);
          
          if (width > 0 && height > 0) {
            losslessProcessor = losslessProcessor.extract({
              left,
              top,
              width,
              height
            });
          }
        }
        
        const losslessBuffer = await losslessProcessor.png({ 
          compressionLevel: 9,
          adaptiveFiltering: true,
          palette: false
        }).toBuffer();
        
        // 尝试第三种方法：降低质量的调色板模式
        let qualityProcessor = sharp(inputPath);
        if (crop && crop.width > 0 && crop.height > 0) {
          const left = Math.max(0, Math.min(Math.round(crop.x), metadata.width - 1));
          const top = Math.max(0, Math.min(Math.round(crop.y), metadata.height - 1));
          const width = Math.min(Math.round(crop.width), metadata.width - left);
          const height = Math.min(Math.round(crop.height), metadata.height - top);
          
          if (width > 0 && height > 0) {
            qualityProcessor = qualityProcessor.extract({
              left,
              top,
              width,
              height
            });
          }
        }
        
        const qualityBuffer = await qualityProcessor.png({ 
          compressionLevel: 9,
          adaptiveFiltering: true,
          palette: true,
          quality: 80, // 降低质量以获得更好的压缩
          effort: 10,
          colors: 64 // 进一步减少颜色数量
        }).toBuffer();
        
        // 比较三种方法，选择最小的文件
        const methods = [
          { name: 'palette', buffer: paletteBuffer },
          { name: 'lossless', buffer: losslessBuffer },
          { name: 'quality', buffer: qualityBuffer }
        ];
        
        const bestMethod = methods.reduce((best, current) => 
          current.buffer.length < best.buffer.length ? current : best
        );
        
        console.log('PNG compression comparison:', {
          paletteSize: paletteBuffer.length,
          losslessSize: losslessBuffer.length,
          qualitySize: qualityBuffer.length,
          chosen: bestMethod.name,
          compressionRatio: ((1 - bestMethod.buffer.length / req.file.size) * 100).toFixed(1) + '%'
        });
        
        const outputBuffer = bestMethod.buffer;
        
        res.set({
          'Content-Type': 'image/png',
          'Content-Length': outputBuffer.length
        });
        
        res.send(outputBuffer);
        
        // 清理临时文件
        fs.unlinkSync(inputPath);
        return;
        
      } else {
        // 没有透明通道，转换为JPEG以获得更好的压缩
        console.log('No alpha channel detected, converting to JPEG for better compression');
        processor = processor.jpeg({ 
          quality: parseInt(quality) || 85,
          progressive: true,
          mozjpeg: true
        });
      }
    } else if (format === 'webp') {
      processor = processor.webp({ 
        quality: parseInt(quality) || 85
      });
    }
    
    // 处理图片
    const outputBuffer = await processor.toBuffer();
    
    console.log('Image processed successfully:', {
      originalSize: req.file.size,
      processedSize: outputBuffer.length,
      compressionRatio: ((1 - outputBuffer.length / req.file.size) * 100).toFixed(1) + '%'
    });
    
    // 返回处理后的图片
    res.set({
      'Content-Type': `image/${format === 'jpg' ? 'jpeg' : format}`,
      'Content-Length': outputBuffer.length
    });
    
    res.send(outputBuffer);
    
    // 清理临时文件
    fs.unlinkSync(inputPath);
    
  } catch (error) {
    console.error('Image processing error:', error);
    res.status(500).json({ error: 'Image processing failed: ' + error.message });
  }
});

// 健康检查API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Image processing server is running' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🖼️  Image processing server running on http://localhost:${PORT}`);
  console.log(`📁  Temp directory: ${tempDir}`);
});
