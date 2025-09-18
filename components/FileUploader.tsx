import React, { useState, useCallback, useEffect } from 'react';
import { TrashIcon } from './icons';

interface FileUploaderProps {
  onFileUpload: (file: File) => void;
  onFileClear?: () => void;
  initialContent?: File | string | { dataUrl: string, name: string } | null;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileUpload, onFileClear, initialContent }) => {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
      if (typeof initialContent === 'string') {
          setPreview(initialContent);
      } else if (initialContent instanceof File) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setPreview(reader.result as string);
          };
          reader.readAsDataURL(initialContent);
      } else if (initialContent && typeof initialContent === 'object' && 'dataUrl' in initialContent) {
          setPreview(initialContent.dataUrl);
      }
      else {
          setPreview(null);
      }
  }, [initialContent]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [onFileUpload]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      onFileUpload(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [onFileUpload]);

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if(onFileClear) {
          onFileClear();
      }
      setPreview(null);
  };

  return (
    <div className="w-full relative group">
      <label
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="flex justify-center w-full h-48 px-4 transition bg-black/20 border-2 border-white/10 border-dashed rounded-md appearance-none cursor-pointer hover:border-blue-500 focus:outline-none"
      >
        {preview ? (
          <img src={preview} alt="Preview" className="object-contain w-full h-full" />
        ) : (
          <span className="flex items-center space-x-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <span className="font-medium text-gray-400">
              Drop file or <span className="text-blue-400 underline">browse</span>
            </span>
          </span>
        )}
        <input type="file" name="file_upload" className="hidden" onChange={handleFileChange} accept="image/*" />
      </label>
      {preview && onFileClear && (
        <button
          onClick={handleClear}
          className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
          aria-label="Remove image"
          title="Remove image"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
