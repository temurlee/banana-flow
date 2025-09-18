interface VisualCropData {
    x: number;
    y: number;
    width: number;
    height: number;
    imageDisplayWidth: number;
    imageDisplayHeight: number;
}

interface DownloadOptions {
    src: string;
    cropPrompt?: string;
    originalName?: string;
    visualCrop?: VisualCropData;
}

interface ProcessImageOptions {
    imageFile: File;
    format: 'jpeg' | 'png' | 'webp';
    quality: number;
    cropData?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

const parseCropPrompt = (prompt?: string): { width: number; height: number } | null => {
    if (!prompt) return null;
    const params = prompt.split(',').map(p => parseInt(p.trim(), 10));
    if (params.length === 2 && !params.some(isNaN)) {
        const [width, height] = params;
        if (width > 0 && height > 0) {
            return { width, height };
        }
    }
    return null;
};

export const downloadImage = async (options: DownloadOptions): Promise<void> => {
    const { src, cropPrompt, originalName, visualCrop } = options;
    const namePart = originalName || 'image';

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = src;

    await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = (err) => reject(new Error(`Failed to load image for download. Error: ${err}`));
    });

    if (!image.naturalWidth) {
        console.error("Image has no natural width, cannot process for download.");
        return;
    }
    
    const promptDimensions = parseCropPrompt(cropPrompt);
    const hasVisualCrop = visualCrop && visualCrop.width > 0 && visualCrop.height > 0 && visualCrop.imageDisplayWidth > 0;

    let sx = 0, sy = 0, sWidth = image.naturalWidth, sHeight = image.naturalHeight; // Source crop
    let dWidth = image.naturalWidth, dHeight = image.naturalHeight; // Destination dimensions

    if (promptDimensions) {
        // SCENARIO 1: Prompt is provided, defining final dimensions and aspect ratio.
        dWidth = promptDimensions.width;
        dHeight = promptDimensions.height;

        // The user's visual crop determines what content to put in the final frame.
        if (hasVisualCrop) {
            const scaleFactor = image.naturalWidth / visualCrop.imageDisplayWidth;
            sx = visualCrop.x * scaleFactor;
            sy = visualCrop.y * scaleFactor;
            sWidth = visualCrop.width * scaleFactor;
            sHeight = visualCrop.height * scaleFactor;
        } else {
            // If no visual crop, fall back to a center crop based on prompt's aspect ratio.
            const originalAspect = image.naturalWidth / image.naturalHeight;
            const targetAspect = dWidth / dHeight;

            if (targetAspect > originalAspect) {
                sWidth = image.naturalWidth;
                sHeight = image.naturalWidth / targetAspect;
                sy = (image.naturalHeight - sHeight) / 2;
            } else {
                sHeight = image.naturalHeight;
                sWidth = image.naturalHeight * targetAspect;
                sx = (image.naturalWidth - sWidth) / 2;
            }
        }
    } else {
        // SCENARIO 2: No prompt provided, free-form cropping.
        if (hasVisualCrop) {
            // Crop to the visually selected area, maintaining its original resolution.
            const scaleFactor = image.naturalWidth / visualCrop.imageDisplayWidth;
            sx = visualCrop.x * scaleFactor;
            sy = visualCrop.y * scaleFactor;
            sWidth = visualCrop.width * scaleFactor;
            sHeight = visualCrop.height * scaleFactor;
            
            dWidth = Math.round(sWidth);
            dHeight = Math.round(sHeight);
        }
        // else: No prompt and no visual crop, so download the full original image.
        // The default values for sx, sy, sWidth, sHeight, dWidth, dHeight are already correct for this case.
    }

    const canvas = document.createElement('canvas');
    canvas.width = dWidth;
    canvas.height = dHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        console.error("Could not get canvas context.");
        return;
    }

    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
        image,
        sx, sy, sWidth, sHeight,
        0, 0, dWidth, dHeight
    );

    let mimeType = 'image/png';
    if (src.startsWith('data:')) {
        const match = src.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);/);
        if (match && match[1]) {
            mimeType = match[1];
        }
    }
    
    const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
    const finalFilename = `${namePart}_${canvas.width}x${canvas.height}.${ext}`;

    const dataUrl = canvas.toDataURL(mimeType);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// 使用后端ImageMagick处理图片
export const processImageWithImageMagick = async (options: ProcessImageOptions): Promise<Blob> => {
    const { imageFile, format, quality, cropData } = options;
    
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('format', format);
    formData.append('quality', quality.toString());
    if (cropData) {
        formData.append('cropData', JSON.stringify(cropData));
    }
    
    try {
        const response = await fetch('http://localhost:3001/api/process-image', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Image processing failed: ${response.status} ${errorText}`);
        }
        
        return await response.blob();
    } catch (error) {
        console.error('ImageMagick processing error:', error);
        throw error;
    }
};

// 检查后端服务是否可用
export const checkImageProcessorHealth = async (): Promise<boolean> => {
    try {
        const response = await fetch('http://localhost:3001/api/health');
        return response.ok;
    } catch (error) {
        console.warn('Image processor not available:', error);
        return false;
    }
};