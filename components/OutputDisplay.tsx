import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NodeStatus } from '../types';
import { DownloadIcon } from './icons';
import { downloadImage, processImageWithImageMagick, checkImageProcessorHealth } from '../services/imageService';

interface ImageWithCropperProps {
    src: string;
    cropPrompt?: string;
    originalName?: string;
}

const ImageWithCropper: React.FC<ImageWithCropperProps> = ({ src, cropPrompt, originalName }) => {
    const [aspect, setAspect] = useState(1);
    const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [isProcessing, setIsProcessing] = useState(false);
    
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const interactionRef = useRef<{
        type: 'move' | 'resize';
        handle: 'tl' | 'tr' | 'bl' | 'br';
        startX: number;
        startY: number;
        startCrop: typeof crop;
    } | null>(null);
    
    const handleDownload = () => {
        if (!imageRef.current) {
            console.error("Image reference not available for download.");
            return;
        }

        downloadImage({
            src,
            originalName,
            cropPrompt,
            visualCrop: {
                x: crop.x,
                y: crop.y,
                width: crop.width,
                height: crop.height,
                imageDisplayWidth: imageRef.current.width,
                imageDisplayHeight: imageRef.current.height,
            }
        });
    };

    const handleCompress = async (format: 'jpeg' | 'png') => {
        if (!imageRef.current || isProcessing) return;
        
        setIsProcessing(true);
        
        try {
            // 检查后端服务是否可用
            const isServerAvailable = await checkImageProcessorHealth();
            if (!isServerAvailable) {
                alert('图片处理服务不可用，请确保后端服务器正在运行');
                return;
            }

            // 获取原始图片
            const response = await fetch(src);
            const blob = await response.blob();
            const file = new File([blob], 'image.png', { type: blob.type });
            
            // 准备裁剪数据（应用cropPrompt逻辑）
            let cropData = null;
            let targetDimensions = null;
            
            // 解析cropPrompt
            if (cropPrompt) {
                const cropParams = cropPrompt.split(',').map(p => parseInt(p.trim(), 10));
                if (cropParams.length === 2 && !cropParams.some(isNaN)) {
                    const [width, height] = cropParams;
                    if (width > 0 && height > 0) {
                        targetDimensions = { width, height };
                    }
                }
            }
            
            if (crop.width > 0 && crop.height > 0) {
                const scaleFactor = imageRef.current.naturalWidth / imageRef.current.width;
                
                if (targetDimensions) {
                    // 有cropPrompt：选区决定源区域，prompt决定目标尺寸
                    cropData = {
                        x: crop.x * scaleFactor,
                        y: crop.y * scaleFactor,
                        width: crop.width * scaleFactor,
                        height: crop.height * scaleFactor,
                        targetWidth: targetDimensions.width,
                        targetHeight: targetDimensions.height
                    };
                } else {
                    // 无cropPrompt：选区决定最终尺寸
                    cropData = {
                        x: crop.x * scaleFactor,
                        y: crop.y * scaleFactor,
                        width: crop.width * scaleFactor,
                        height: crop.height * scaleFactor
                    };
                }
            } else if (targetDimensions) {
                // 有cropPrompt但无选区：居中裁剪
                const imageAspect = imageRef.current.naturalWidth / imageRef.current.naturalHeight;
                const targetAspect = targetDimensions.width / targetDimensions.height;
                
                let sx, sy, sWidth, sHeight;
                if (targetAspect > imageAspect) {
                    sWidth = imageRef.current.naturalWidth;
                    sHeight = imageRef.current.naturalWidth / targetAspect;
                    sx = 0;
                    sy = (imageRef.current.naturalHeight - sHeight) / 2;
                } else {
                    sHeight = imageRef.current.naturalHeight;
                    sWidth = imageRef.current.naturalHeight * targetAspect;
                    sy = 0;
                    sx = (imageRef.current.naturalWidth - sWidth) / 2;
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
            
            // 生成文件名
            const namePart = originalName || 'image';
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
            
        } catch (error) {
            console.error('Compression failed:', error);
            alert('压缩失败: ' + (error as Error).message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width: imageDisplayWidth, height: imageDisplayHeight } = e.currentTarget;
        if (!imageDisplayWidth || !imageDisplayHeight) return;

        const imageAspect = imageDisplayWidth / imageDisplayHeight;
        let targetAspect = imageAspect; 

        if (cropPrompt) {
            const cropParams = cropPrompt.split(',').map(p => Number(p.trim()));
            if (cropParams.length === 2 && !cropParams.some(isNaN)) {
                const [reqWidth, reqHeight] = cropParams;
                if (reqWidth > 0 && reqHeight > 0) {
                    targetAspect = reqWidth / reqHeight;
                }
            }
        }

        let newCropWidth, newCropHeight, newCropX, newCropY;

        if (targetAspect > imageAspect) {
            newCropWidth = imageDisplayWidth;
            newCropHeight = imageDisplayWidth / targetAspect;
            newCropX = 0;
            newCropY = (imageDisplayHeight - newCropHeight) / 2;
        } else {
            newCropHeight = imageDisplayHeight;
            newCropWidth = imageDisplayHeight * targetAspect;
            newCropY = 0;
            newCropX = (imageDisplayWidth - newCropWidth) / 2;
        }

        setAspect(targetAspect);
        setCrop({
            width: newCropWidth,
            height: newCropHeight,
            x: newCropX,
            y: newCropY,
        });
    };
    
    useEffect(() => {
        // Recalculate crop when prompt changes
        if (imageRef.current?.complete) {
            handleImageLoad({ currentTarget: imageRef.current } as any);
        }
    }, [cropPrompt]);
    
    const handleInteractionStart = (
        e: React.MouseEvent<HTMLDivElement>, 
        type: 'move' | 'resize', 
        handle: 'tl' | 'tr' | 'bl' | 'br' = 'br'
    ) => {
        e.preventDefault();
        e.stopPropagation();
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        interactionRef.current = {
            type,
            handle,
            startX: e.clientX - rect.left,
            startY: e.clientY - rect.top,
            startCrop: { ...crop },
        };
        
        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!interactionRef.current || !imageRef.current) return;
            const { startX, startY, startCrop, type, handle } = interactionRef.current;
            const { width: imgWidth, height: imgHeight } = imageRef.current;

            const dx = moveEvent.clientX - rect.left - startX;
            const dy = moveEvent.clientY - rect.top - startY;

            let newCrop = { ...startCrop };

            if (type === 'move') {
                newCrop.x = startCrop.x + dx;
                newCrop.y = startCrop.y + dy;
                newCrop.x = Math.max(0, newCrop.x);
                newCrop.y = Math.max(0, newCrop.y);
                if (newCrop.x + newCrop.width > imgWidth) newCrop.x = imgWidth - newCrop.width;
                if (newCrop.y + newCrop.height > imgHeight) newCrop.y = imgHeight - newCrop.height;

            } else { // resize
                const anchor = {
                    x: handle.includes('l') ? startCrop.x + startCrop.width : startCrop.x,
                    y: handle.includes('t') ? startCrop.y + startCrop.height : startCrop.y,
                };
                
                const mousePoint = {
                    x: interactionRef.current.startX + dx,
                    y: interactionRef.current.startY + dy,
                };
                
                let newWidth = Math.abs(mousePoint.x - anchor.x);
                let newHeight = Math.abs(mousePoint.y - anchor.y);

                if (cropPrompt) { // Constrain aspect ratio if prompt exists
                    if (newWidth / aspect > newHeight) {
                        newHeight = newWidth / aspect;
                    } else {
                        newWidth = newHeight * aspect;
                    }
                }
                
                let newX, newY;
                if (handle.includes('l')) {
                    newX = anchor.x - newWidth;
                } else {
                    newX = anchor.x;
                }
                if (handle.includes('t')) {
                    newY = anchor.y - newHeight;
                } else {
                    newY = anchor.y;
                }
                
                if (newWidth < 20) {
                    newWidth = 20;
                    if(cropPrompt) newHeight = newWidth / aspect;
                }
                if (newHeight < 20) {
                    newHeight = 20;
                    if(cropPrompt) newWidth = newHeight * aspect;
                }

                if (newX < 0) {
                    const delta = -newX;
                    newX = 0;
                    newWidth -= delta;
                    if(cropPrompt) newHeight = newWidth / aspect;
                }
                if (newY < 0) {
                    const delta = -newY;
                    newY = 0;
                    newHeight -= delta;
                    if(cropPrompt) newWidth = newHeight * aspect;
                }

                if (newX + newWidth > imgWidth) {
                    newWidth = imgWidth - newX;
                    if(cropPrompt) newHeight = newWidth / aspect;
                }

                if (newY + newHeight > imgHeight) {
                    newHeight = imgHeight - newY;
                    if(cropPrompt) newWidth = newHeight * aspect;
                }
                
                newCrop = { x: newX, y: newY, width: newWidth, height: newHeight };
            }
            
            setCrop(newCrop);
        };

        const handleMouseUp = () => {
            interactionRef.current = null;
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handles: Array<'tl' | 'tr' | 'bl' | 'br'> = ['tl', 'tr', 'bl', 'br'];

    return (
        <div ref={containerRef} className="relative inline-block select-none touch-none group">
            <img 
              ref={imageRef} 
              src={src} 
              alt="Generated output for cropping" 
              className="block max-w-full max-h-[70vh]" 
              onLoad={handleImageLoad}
              style={{ userSelect: 'none' }}
            />
            {crop.width > 0 && imageRef.current && (
                <>
                    <div
                        className="absolute top-0 left-0 bg-black/60 pointer-events-none"
                        style={{
                            width: imageRef.current.width,
                            height: imageRef.current.height,
                            clipPath: `path(evenodd, 'M 0 0 H ${imageRef.current.width} V ${imageRef.current.height} H 0 Z M ${crop.x} ${crop.y} H ${crop.x + crop.width} V ${crop.y + crop.height} H ${crop.x} Z')`,
                        }}
                    />
                    
                    <div 
                        className="absolute cursor-move"
                        style={{
                            left: crop.x,
                            top: crop.y,
                            width: crop.width,
                            height: crop.height,
                            border: '1px dashed rgba(255, 255, 255, 0.8)',
                        }}
                        onMouseDown={(e) => handleInteractionStart(e, 'move')}
                    >
                        {handles.map(handle => (
                             <div
                                key={handle}
                                onMouseDown={(e) => handleInteractionStart(e, 'resize', handle)}
                                className="absolute w-3 h-3 bg-white rounded-full"
                                style={{
                                    top: handle.includes('t') ? '-6px' : 'auto',
                                    bottom: handle.includes('b') ? '-6px' : 'auto',
                                    left: handle.includes('l') ? '-6px' : 'auto',
                                    right: handle.includes('r') ? '-6px' : 'auto',
                                    cursor: cropPrompt ? `${handle.slice(0,1)}${handle.slice(1,2)}-resize` : `${handle.slice(0,1)}-${handle.slice(1,2)}-resize`
                                }}
                            />
                        ))}
                    </div>
                </>
            )}
            <div className="absolute top-2 right-2 flex items-center space-x-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* 下载按钮 - 原始质量 */}
                <button
                    onClick={handleDownload}
                    className="p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                    aria-label="Download original quality image"
                    title="下载原始质量图片"
                >
                    <DownloadIcon className="w-5 h-5" />
                </button>
                
                {/* 压缩按钮 - 优化大小 */}
                <div className="relative group/compress">
                    <button
                        className="p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                        aria-label="Compress image for smaller file size"
                        title="压缩图片减小文件大小"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                            <path d="M42 19H5.99998" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M30 7L42 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M6.79897 29H42.799" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M6.79895 29L18.799 41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                    
                    {/* 压缩格式选择菜单 */}
                    <div className="absolute top-full right-0 mt-2 w-32 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover/compress:opacity-100 group-hover/compress:visible transition-all duration-200">
                        <div className="py-1">
                            <button
                                className="w-full px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground text-left transition-colors disabled:opacity-50"
                                onClick={() => handleCompress('jpeg')}
                                disabled={isProcessing}
                                title="压缩为JPG格式（适合照片）"
                            >
                                {isProcessing ? '处理中...' : 'JPG 压缩'}
                            </button>
                            <button
                                className="w-full px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground text-left transition-colors disabled:opacity-50"
                                onClick={() => handleCompress('png')}
                                disabled={isProcessing}
                                title="压缩为PNG格式（适合透明图片）"
                            >
                                {isProcessing ? '处理中...' : 'PNG 压缩'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


interface OutputDisplayProps {
  content: any;
  status: NodeStatus;
  errorMessage?: string;
  progressMessage?: string;
}

export const OutputDisplay: React.FC<OutputDisplayProps> = ({ content, status, errorMessage, progressMessage }) => {
  if (status === NodeStatus.PROCESSING) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 space-y-2 text-center bg-transparent rounded-lg">
        <div className="w-6 h-6 border-2 border-t-blue-400 border-gray-600 rounded-full animate-spin"></div>
        <p className="text-sm text-gray-300">{progressMessage || 'Processing...'}</p>
      </div>
    );
  }

  if (status === NodeStatus.ERROR) {
    return (
      <div className="p-4 text-red-400 bg-red-900/50 rounded-lg">
        <h4 className="font-bold">Error</h4>
        <p className="text-sm break-words">{errorMessage}</p>
      </div>
    );
  }

  const renderMedia = (src: string, isVideo = false, cropPrompt?: string, originalName?: string) => {
    if (isVideo) {
        return (
            <div className="relative group w-full bg-black/20 rounded-lg flex items-center justify-center">
                <video src={src} controls className="object-contain w-full" />
            </div>
        );
    }
    
    return (
        <div className="w-full bg-black/20 rounded-lg flex items-center justify-center">
            <ImageWithCropper src={src} cropPrompt={cropPrompt} originalName={originalName} />
        </div>
    );
  };
    
  if (status === NodeStatus.COMPLETED && content) {
    if (typeof content === 'string') {
        if (content.startsWith('data:image')) {
            return renderMedia(content);
        }
        if (content.startsWith('blob:')) {
             return renderMedia(content, true);
        }
        return <p className="text-sm text-gray-300 whitespace-pre-wrap">{content}</p>;
    }
    
    if (content.image && typeof content.image === 'string' && content.image.startsWith('data:image')) {
        return renderMedia(content.image, false, content.cropPrompt, content.originalName);
    }
    if (content.text && typeof content.text === 'string') {
        return <p className="text-sm text-gray-300 whitespace-pre-wrap">{content.text}</p>;
    }
    if (content.base64Image) {
        const dataUrl = `data:image/png;base64,${content.base64Image}`;
        return renderMedia(dataUrl);
    }

    if (typeof content !== 'object') {
        return <p className="text-sm text-gray-300 whitespace-pre-wrap">{String(content)}</p>;
    }
  }

  return <div className="text-sm text-gray-500">Output will appear here.</div>;
};