import React from 'react';
import type { HistoryItem } from '../types';
import { DownloadIcon, UploadIcon, TrashIcon, ChevronRightIcon } from './icons';
import { downloadImage } from '../services/imageService';

interface HistorySidebarProps {
  history: HistoryItem[];
  onUseAsInput: (item: HistoryItem) => void;
  onToggle: () => void;
  onClearHistory: () => void;
}


const HistorySidebar: React.FC<HistorySidebarProps> = ({ history, onUseAsInput, onToggle, onClearHistory }) => {

  const handleDownload = (item: HistoryItem) => {
      downloadImage({
          src: item.dataUrl,
          originalName: item.originalName,
          cropPrompt: item.cropPrompt,
      });
  };

  const handleDownloadAll = () => {
    history.forEach((item, index) => {
      setTimeout(() => {
        handleDownload(item);
      }, index * 200);
    });
  };

  return (
    <div className="z-10 flex flex-col flex-shrink-0 h-full bg-[#1E1F22] border-l border-white/10 transition-all duration-300 ease-in-out w-80 p-3">
      <div className="flex justify-between items-center w-full mb-4 flex-shrink-0">
        <h2 className="text-xl font-semibold text-white flex-shrink-0 px-2">History</h2>
        <button onClick={onToggle} className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-md">
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>

        <>
          <div className="flex items-center justify-between px-2 mb-3 flex-shrink-0">
            <button 
              onClick={handleDownloadAll}
              disabled={history.length === 0}
              className="flex items-center gap-2 text-xs text-gray-300 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed"
            >
              <DownloadIcon className="w-4 h-4"/>
              全部下载
            </button>
            <button 
              onClick={onClearHistory}
              disabled={history.length === 0}
              className="flex items-center gap-2 text-xs text-gray-300 hover:text-red-400 disabled:text-gray-600 disabled:cursor-not-allowed"
            >
               <TrashIcon className="w-4 h-4"/>
               全部清除
            </button>
          </div>

          {history.length === 0 ? (
            <div className="flex-grow flex items-center justify-center text-center">
                <p className="text-gray-500">Output images will appear here.</p>
            </div>
          ) : (
          <div className="flex-grow overflow-y-auto pr-2 space-y-3">
            {history.map((item) => (
              <div key={item.id} className="bg-[#282A2D] p-3 rounded-lg border border-transparent hover:border-white/10 transition-colors group">
                <img src={item.dataUrl} alt="Generated asset" className="w-full rounded-md mb-3" />
                {item.width && item.height && (
                  <p className="text-xs text-gray-500 mb-2 text-center font-mono">{item.width} x {item.height}</p>
                )}
                <p className="text-xs text-gray-400 mb-3 line-clamp-3" title={item.prompt}>{item.prompt}</p>
                <div className="flex items-center justify-end space-x-2">
                  <button 
                    onClick={() => onUseAsInput(item)}
                    className="flex items-center px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    title="Use as Input Node"
                  >
                    <UploadIcon className="w-4 h-4 mr-1.5" />
                    Use
                  </button>

                  <button 
                    onClick={() => handleDownload(item)}
                    className="p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70"
                    aria-label="Download image"
                    title="Download"
                  >
                      <DownloadIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          )}
        </>
    </div>
  );
};

export default HistorySidebar;