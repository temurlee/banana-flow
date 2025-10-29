import { downloadImage, processImageWithImageMagick, checkImageProcessorHealth } from './imageService';
import type { BatchDownloadImage, BatchDownloadOptions, BatchDownloadProgress } from '../types';

export const downloadAllImages = async (
  options: BatchDownloadOptions,
  onProgress?: (progress: BatchDownloadProgress) => void
): Promise<void> => {
  const { format, images } = options;
  
  if (images.length === 0) {
    throw new Error('没有可下载的图像');
  }

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    
    try {
      // 更新进度
      onProgress?.({
        current: i + 1,
        total: images.length,
        currentFileName: image.originalName,
        isComplete: false
      });

      if (format === 'original') {
        // 使用现有的原始质量下载逻辑
        await downloadImage({
          src: image.src,
          originalName: image.originalName,
          cropPrompt: image.cropPrompt,
          visualCrop: image.visualCrop
        });
      } else {
        // 使用现有的压缩下载逻辑
        await compressAndDownloadImage(image, format);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      onProgress?.({
        current: i + 1,
        total: images.length,
        currentFileName: image.originalName,
        isComplete: false,
        error: errorMessage
      });
      
      // 继续处理下一个文件，不中断整个批量下载
      console.error(`下载失败 ${image.originalName}:`, error);
    }
  }

  // 完成
  onProgress?.({
    current: images.length,
    total: images.length,
    currentFileName: '',
    isComplete: true
  });
};

const compressAndDownloadImage = async (
  image: BatchDownloadImage,
  format: 'jpeg' | 'png'
): Promise<void> => {
  // 检查后端服务是否可用
  const isServerAvailable = await checkImageProcessorHealth();
  if (!isServerAvailable) {
    throw new Error('图片处理服务不可用，请确保后端服务器正在运行');
  }

  // 获取原始图片
  const response = await fetch(image.src);
  const blob = await response.blob();
  const file = new File([blob], 'image.png', { type: blob.type });
  
  // 准备裁剪数据（复用现有的逻辑）
  let cropData = null;
  let targetDimensions = null;
  
  // 解析cropPrompt
  if (image.cropPrompt) {
    const cropParams = image.cropPrompt.split(',').map(p => parseInt(p.trim(), 10));
    if (cropParams.length === 2 && !cropParams.some(isNaN)) {
      const [width, height] = cropParams;
      if (width > 0 && height > 0) {
        targetDimensions = { width, height };
      }
    }
  }
  
  if (image.visualCrop && image.visualCrop.width > 0 && image.visualCrop.height > 0) {
    // 需要获取图片的实际尺寸来计算缩放因子
    const tempImg = new Image();
    tempImg.src = image.src;
    await new Promise(resolve => tempImg.onload = resolve);
    
    const scaleFactor = tempImg.naturalWidth / image.visualCrop.imageDisplayWidth;
    
    if (targetDimensions) {
      // 有cropPrompt：选区决定源区域，prompt决定目标尺寸
      cropData = {
        x: image.visualCrop.x * scaleFactor,
        y: image.visualCrop.y * scaleFactor,
        width: image.visualCrop.width * scaleFactor,
        height: image.visualCrop.height * scaleFactor,
        targetWidth: targetDimensions.width,
        targetHeight: targetDimensions.height
      };
    } else {
      // 无cropPrompt：选区决定最终尺寸
      cropData = {
        x: image.visualCrop.x * scaleFactor,
        y: image.visualCrop.y * scaleFactor,
        width: image.visualCrop.width * scaleFactor,
        height: image.visualCrop.height * scaleFactor
      };
    }
  } else if (targetDimensions) {
    // 有cropPrompt但无选区：居中裁剪
    const tempImg = new Image();
    tempImg.src = image.src;
    await new Promise(resolve => tempImg.onload = resolve);
    
    const imageAspect = tempImg.naturalWidth / tempImg.naturalHeight;
    const targetAspect = targetDimensions.width / targetDimensions.height;
    
    let sx, sy, sWidth, sHeight;
    if (targetAspect > imageAspect) {
      sWidth = tempImg.naturalWidth;
      sHeight = tempImg.naturalWidth / targetAspect;
      sx = 0;
      sy = (tempImg.naturalHeight - sHeight) / 2;
    } else {
      sHeight = tempImg.naturalHeight;
      sWidth = tempImg.naturalHeight * targetAspect;
      sy = 0;
      sx = (tempImg.naturalWidth - sWidth) / 2;
    }
    
    cropData = {
      x: sx,
      y: sy,
      width: sWidth,
      height: sHeight,
      targetWidth: targetDimensions.width,
      targetHeight: targetDimensions.height
    };
  }
  
  // 处理图片
  const processedBlob = await processImageWithImageMagick({
    imageFile: file,
    format,
    quality: format === 'jpeg' ? 85 : 90,
    cropData
  });
  
  // 获取压缩后图片的尺寸信息
  const tempImg = new Image();
  tempImg.src = URL.createObjectURL(processedBlob);
  await new Promise(resolve => tempImg.onload = resolve);
  
  // 生成文件名（复用现有逻辑）
  const namePart = image.originalName || 'image';
  const width = tempImg.naturalWidth;
  const height = tempImg.naturalHeight;
  const ext = format === 'jpeg' ? 'jpg' : format;
  const filename = `${namePart}_compressed_${width}x${height}.${ext}`;
  
  // 下载
  const url = URL.createObjectURL(processedBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  URL.revokeObjectURL(tempImg.src);
};

// 从工作流状态中提取所有可下载的图像
export const extractDownloadableImages = (nodes: Record<string, any>): BatchDownloadImage[] => {
  const images: BatchDownloadImage[] = [];
  
  Object.values(nodes).forEach(node => {
    if (node.type === 'OUTPUT_DISPLAY' && 
        node.data.status === 'COMPLETED' && 
        node.data.content) {
      
      const content = node.data.content;
      
      // 检查是否有图像内容
      if (content.image && typeof content.image === 'string' && content.image.startsWith('data:image')) {
        images.push({
          src: content.image,
          originalName: content.originalName || `output-${node.id.slice(-8)}`,
          cropPrompt: content.cropPrompt
        });
      }
    }
  });
  
  return images;
};
