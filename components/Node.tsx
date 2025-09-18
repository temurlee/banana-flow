import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { Node, NodeInput, NodeOutput } from '../types';
import { NodeType, NodeStatus } from '../types';
import { TextIcon, ImageIcon, MagicIcon, VideoIcon, OutputIcon, StarIcon, MuteIcon, ConditionalIcon } from './icons';
import { FileUploader } from './FileUploader';
import { OutputDisplay } from './OutputDisplay';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

interface NodeProps {
  node: Node;
  isSelected: boolean;
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>, nodeId: string) => void;
  onHandleMouseDown: (e: React.MouseEvent<HTMLDivElement>, nodeId: string, handleId: string, handleType: 'input' | 'output') => void;
  onResizeMouseDown: (e: React.MouseEvent<HTMLDivElement>, nodeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<Node['data']>) => void;
}

const NodeHeader: React.FC<{ node: Node }> = ({ node }) => {
  const config = useMemo(() => {
    const type = node.type;
    switch (type) {
      case NodeType.TEXT_INPUT:
        return { icon: <TextIcon className="w-4 h-4" />, title: 'Text Input', variant: 'default' as const };
      case NodeType.IMAGE_INPUT:
        return { icon: <ImageIcon className="w-4 h-4" />, title: 'Image Input', variant: 'secondary' as const };
      case NodeType.TEXT_GENERATOR:
        return { icon: <MagicIcon className="w-4 h-4" />, title: 'Text Generator', variant: 'default' as const };
      case NodeType.IMAGE_EDITOR:
        return { icon: <MagicIcon className="w-4 h-4" />, title: 'Image Editor', variant: 'outline' as const };
      case NodeType.PROMPT_PRESET:
        return { icon: <StarIcon className="w-4 h-4" />, title: node.data.label, variant: 'outline' as const };
      case NodeType.VIDEO_GENERATOR:
        return { icon: <VideoIcon className="w-4 h-4" />, title: 'Video Generator', variant: 'destructive' as const };
      case NodeType.CONDITIONAL:
        return { icon: <ConditionalIcon className="w-4 h-4" />, title: 'Conditional', variant: 'secondary' as const };
      case NodeType.OUTPUT_DISPLAY:
        return { icon: <OutputIcon className="w-4 h-4" />, title: 'Output', variant: 'secondary' as const };
      default:
        return { icon: null, title: 'Unknown', variant: 'outline' as const };
    }
  }, [node.type, node.data.label]);

  return (
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {config.icon}
          <h3 className="font-semibold text-sm text-foreground">{config.title}</h3>
        </div>
        <div className="flex items-center space-x-1">
          {node.data.isMuted && (
            <Badge variant="outline" className="text-xs">
              <MuteIcon className="w-3 h-3 mr-1" />
              Muted
            </Badge>
          )}
        </div>
      </div>
    </CardHeader>
  );
};

const Handle: React.FC<{
  id: string;
  label: string;
  isInput: boolean;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
}> = ({ id, label, isInput, onMouseDown }) => (
  <div className="relative flex items-center h-7 my-1 group">
    <div
      id={id}
      data-handle-type={isInput ? 'input' : 'output'}
      onMouseDown={onMouseDown}
      className={cn(
        "absolute top-1/2 w-3 h-3 rounded-full border-2 cursor-pointer transition-colors",
        "bg-muted border-border group-hover:bg-primary group-hover:border-primary"
      )}
      style={{
        transform: 'translateY(-50%)',
        ...(isInput ? { left: '-6px' } : { right: '-6px' }),
      }}
    />
    <span 
      className={cn(
        "text-sm text-muted-foreground group-hover:text-foreground transition-colors",
        isInput ? 'ml-5 text-left' : 'mr-5 text-right'
      )} 
      title={label}
    >
      {label}
    </span>
  </div>
);


const NodeComponent: React.FC<NodeProps> = ({ node, isSelected, isDragging, onMouseDown, onHandleMouseDown, onResizeMouseDown, updateNodeData }) => {
    const computedClassName = useMemo(() => {
        const classes = ['absolute'];

        if (node.data.isMuted) {
            classes.push('opacity-50');
        }

        if (isDragging) {
            classes.push('will-change-transform');
        } else {
            classes.push('transition-all', 'duration-150');
        }

        return classes.join(' ');
    }, [node.data.isMuted, isDragging]);

    const getStatusVariant = useMemo(() => {
        if (isSelected) return 'ring-1 ring-foreground/20';
        
        // 只在错误状态时显示描边，其他状态不显示
        switch (node.data.status) {
            case NodeStatus.ERROR: return 'ring-1 ring-destructive/50';
            default: return '';
        }
    }, [node.data.status, isSelected]);

  const handleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        if (reader.result) {
            updateNodeData(node.id, { content: { dataUrl: reader.result as string, name: file.name } });
        }
    };
    reader.readAsDataURL(file);
  }, [node.id, updateNodeData]);

  const renderNodeContent = () => {
    switch (node.type) {
      case NodeType.TEXT_INPUT:
        return (
          <textarea
            className="w-full p-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm text-foreground placeholder:text-muted-foreground"
            rows={3}
            value={node.data.content || ''}
            onChange={(e) => updateNodeData(node.id, { content: e.target.value })}
            placeholder="Enter text here..."
          />
        );
      case NodeType.IMAGE_INPUT:
        return <FileUploader 
            onFileUpload={handleImageUpload}
            initialContent={node.data.content}
            onFileClear={() => updateNodeData(node.id, { content: null })}
        />;
      case NodeType.TEXT_GENERATOR:
      case NodeType.IMAGE_EDITOR:
      case NodeType.VIDEO_GENERATOR:
      case NodeType.PROMPT_PRESET:
      case NodeType.CONDITIONAL:
          return <div className="p-2 text-sm text-gray-400">Ready to receive inputs.</div>;
      case NodeType.OUTPUT_DISPLAY:
        return <OutputDisplay content={node.data.content} status={node.data.status} errorMessage={node.data.errorMessage} progressMessage={node.data.progressMessage} />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      data-node-id={node.id}
      className={computedClassName}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: node.data.width || 250,
      }}
      onMouseDown={(e) => onMouseDown(e, node.id)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <Card className={cn("w-full shadow-sm border-border/50", getStatusVariant)}>
        <NodeHeader node={node} />
        <CardContent className="relative p-3 pt-0">
          <div className="grid grid-cols-2 gap-x-4">
              <div className="flex flex-col items-start">
                  {node.data.inputs.map((input) => (
                    <Handle key={input.id} id={input.id} label={input.label} isInput={true} onMouseDown={(e) => onHandleMouseDown(e, node.id, input.id, 'input')} />
                  ))}
              </div>
               <div className="flex flex-col items-end">
                  {node.data.outputs.map((output) => (
                    <Handle key={output.id} id={output.id} label={output.label} isInput={false} onMouseDown={(e) => onHandleMouseDown(e, node.id, output.id, 'output')} />
                  ))}
              </div>
          </div>
          
          <div className={cn(
            "pt-2 mt-2",
            (node.data.inputs.length > 0 || node.data.outputs.length > 0) && "border-t border-border"
          )}>
              {renderNodeContent()}
          </div>
          
          <div
            className="absolute top-1/2 right-0 w-1.5 h-5 bg-muted/0 hover:bg-primary rounded-sm cursor-ew-resize transition-colors"
            style={{ transform: 'translate(50%, -50%)' }}
            onMouseDown={(e) => onResizeMouseDown(e, node.id)}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default React.memo(NodeComponent);