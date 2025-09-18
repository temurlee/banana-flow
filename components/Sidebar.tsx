import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NodeType } from '../types';
import { TextIcon, ImageIcon, MagicIcon, VideoIcon, OutputIcon, StarIcon, ConditionalIcon, ChevronLeftIcon, MenuIcon } from './icons';
import { PRESET_CONFIGS } from '../presets';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface SidebarProps {
  onAddNode: (type: NodeType, presetId?: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const SidebarButton: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; tooltip?: string }> = ({ icon, label, onClick, tooltip }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClick}
          className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          {icon}
          <span className="ml-3 text-sm font-medium truncate">{label}</span>
        </Button>
      </TooltipTrigger>
      {tooltip && (
        <TooltipContent side="right">
          <p>{tooltip}</p>
        </TooltipContent>
      )}
    </Tooltip>
  </TooltipProvider>
);

const SidebarContent: React.FC<{ onAddNode: (type: NodeType, presetId?: string) => void }> = ({ onAddNode }) => (
  <div className="flex flex-col space-y-6 flex-grow min-h-0 overflow-y-auto">
    <div>
      <h3 className="px-2 mb-3 text-sm font-semibold tracking-wider text-muted-foreground uppercase">Core</h3>
      <div className="space-y-1">
        <SidebarButton
          icon={<TextIcon className="w-4 h-4" />}
          label="Text Input"
          onClick={() => onAddNode(NodeType.TEXT_INPUT)}
          tooltip="Add text input node"
        />
        <SidebarButton
          icon={<ImageIcon className="w-4 h-4" />}
          label="Image Input"
          onClick={() => onAddNode(NodeType.IMAGE_INPUT)}
          tooltip="Add image input node"
        />
        <SidebarButton
          icon={<MagicIcon className="w-4 h-4" />}
          label="Image Editor"
          onClick={() => onAddNode(NodeType.IMAGE_EDITOR)}
          tooltip="Add AI image editor node"
        />
        <SidebarButton
          icon={<VideoIcon className="w-4 h-4" />}
          label="Video Generator"
          onClick={() => onAddNode(NodeType.VIDEO_GENERATOR)}
          tooltip="Add video generator node"
        />
        <SidebarButton
          icon={<ConditionalIcon className="w-4 h-4" />}
          label="Conditional"
          onClick={() => onAddNode(NodeType.CONDITIONAL)}
          tooltip="Add conditional logic node"
        />
        <SidebarButton
          icon={<OutputIcon className="w-4 h-4" />}
          label="Output"
          onClick={() => onAddNode(NodeType.OUTPUT_DISPLAY)}
          tooltip="Add output display node"
        />
      </div>
    </div>

    <div>
      <h3 className="px-2 mb-3 text-sm font-semibold tracking-wider text-muted-foreground uppercase">Prompt Presets</h3>
      <div className="space-y-1">
        {Object.entries(PRESET_CONFIGS).map(([id, config]) => (
          <SidebarButton
            key={id}
            icon={<StarIcon className="w-4 h-4" />}
            label={config.label}
            onClick={() => onAddNode(NodeType.PROMPT_PRESET, id)}
            tooltip={config.description || `Add ${config.label} preset`}
          />
        ))}
      </div>
    </div>
  </div>
);

const Sidebar: React.FC<SidebarProps> = ({ onAddNode, isCollapsed, onToggleCollapse }) => {
  if (isCollapsed) {
    return (
        <div className="absolute top-4 left-4 z-30 group">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onToggleCollapse}
                    variant="outline"
                    size="icon"
                    className="bg-card/80 border-border backdrop-blur-sm text-muted-foreground hover:text-foreground"
                    aria-label="Restore sidebar"
                  >
                    <MenuIcon className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Restore sidebar</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div 
              className="absolute top-full pt-2 left-0 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200"
            >
                <div 
                  className="w-64 bg-card/95 border border-border rounded-lg shadow-lg backdrop-blur-sm"
                  style={{ 
                    height: 'calc(100vh - 6rem)', 
                    maxHeight: '600px',
                    overflow: 'hidden'
                  }}
                >
                  <div className="p-3 h-full overflow-y-auto">
                    <SidebarContent onAddNode={onAddNode} />
                  </div>
                </div>
            </div>
        </div>
    );
  }

  return (
    <motion.div 
      className="absolute top-0 left-0 z-10 flex flex-col h-full p-3 bg-card/80 backdrop-blur-sm border-r border-border/50 w-64"
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <h2 className="text-xl font-semibold text-foreground px-2">BananaFlow</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={onToggleCollapse} 
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground" 
                  aria-label="Collapse sidebar"
                >
                    <ChevronLeftIcon className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Collapse sidebar</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
      </div>
      
      <SidebarContent onAddNode={onAddNode} />
    </motion.div>
  );
};

export default Sidebar;