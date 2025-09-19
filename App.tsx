import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Node, Edge, Point, NodeInput, NodeOutput, Group } from './types';
import { NodeType, NodeStatus } from './types';
import Sidebar from './components/Sidebar';
import NodeComponent from './components/Node';
import EdgeComponent from './components/Edge';
import GroupComponent from './components/GroupComponent';
import { PlayIcon, SaveIcon, FolderOpenIcon, UndoIcon, RedoIcon } from './components/icons';
import * as geminiService from './services/geminiService';
import { PRESET_CONFIGS } from './presets';
import { applyAlignment, createNodeBounds, type AlignmentConfig, type AlignmentResult, type AlignmentGuide } from './lib/alignmentUtils';

interface WorkflowState {
  nodes: Record<string, Node>;
  edges: Record<string, Edge>;
  groups: Record<string, Group>;
}

// Fix: Refactored the undoable state hook to be atomic and prevent race conditions.
const useUndoableState = <T,>(initialState: T) => {
    const [undoable, setUndoable] = useState({
        history: [initialState],
        currentIndex: 0,
    });

    const { history, currentIndex } = undoable;
    const state = history[currentIndex];
    
    const setState = useCallback((value: T | ((prevState: T) => T)) => {
        setUndoable(current => {
            const currentState = current.history[current.currentIndex];
            const newState = typeof value === 'function' ? (value as (prevState: T) => T)(currentState) : value;
            
            if (JSON.stringify(newState) === JSON.stringify(currentState)) {
                return current; 
            }
            
            const newHistory = current.history.slice(0, current.currentIndex + 1);
            newHistory.push(newState);
            
            return {
                history: newHistory,
                currentIndex: newHistory.length - 1
            };
        });
    }, []);
    
    const undo = useCallback(() => {
        setUndoable(current => {
            if (current.currentIndex > 0) {
                return { ...current, currentIndex: current.currentIndex - 1 };
            }
            return current;
        });
    }, []);
    
    const redo = useCallback(() => {
        setUndoable(current => {
            if (current.currentIndex < current.history.length - 1) {
                return { ...current, currentIndex: current.currentIndex - 1 };
            }
            return current;
        });
    }, []);

    const resetState = useCallback((newState: T) => {
        setUndoable({
            history: [newState],
            currentIndex: 0,
        });
    }, []);

    return { state, setState, resetState, undo, redo, canUndo: currentIndex > 0, canRedo: currentIndex < history.length - 1 };
};


const createNode = (type: NodeType, position: Point, presetId?: string): Node => {
  const id = crypto.randomUUID();
  const baseNode = { id, type, position, data: { status: NodeStatus.IDLE, content: null, inputs: [] as NodeInput[], outputs: [] as NodeOutput[], width: 250, isMuted: false, progressMessage: "" } };

  switch (type) {
    case NodeType.TEXT_INPUT:
      return { ...baseNode, data: { ...baseNode.data, label: 'Text Input', content: '', outputs: [{ id: `${id}-output`, label: 'Text', type: 'text' }] } };
    case NodeType.IMAGE_INPUT:
      return { ...baseNode, data: { ...baseNode.data, label: 'Image Input', width: 300, outputs: [{ id: `${id}-output`, label: 'Image', type: 'image' }] } };
    case NodeType.TEXT_GENERATOR:
      return { ...baseNode, data: { ...baseNode.data, label: 'Text Generator', inputs: [{ id: `${id}-input`, label: 'Prompt', type: 'text' }], outputs: [{ id: `${id}-output`, label: 'Text', type: 'text' }] } };
    case NodeType.IMAGE_EDITOR:
      return { ...baseNode, data: { ...baseNode.data, label: 'Image Editor', inputs: [{ id: `${id}-input-image`, label: 'Image', type: 'image' }, { id: `${id}-input-text`, label: 'Prompt', type: 'text' }], outputs: [{ id: `${id}-output-image`, label: 'Image', type: 'image' }, { id: `${id}-output-text`, label: 'Text', type: 'text' }] } };
    case NodeType.VIDEO_GENERATOR:
      return { ...baseNode, data: { ...baseNode.data, label: 'Video Generator', inputs: [{ id: `${id}-input-image`, label: 'Image (Opt.)', type: 'image' }, { id: `${id}-input-text`, label: 'Prompt', type: 'text' }], outputs: [{ id: `${id}-output`, label: 'Video', type: 'video' }] } };
    case NodeType.CONDITIONAL:
        return { ...baseNode, data: { ...baseNode.data, label: 'Conditional', inputs: [{ id: `${id}-input-image`, label: 'Image', type: 'image' }, { id: `${id}-input-prompt`, label: 'Prompt', type: 'text' }], outputs: [{ id: `${id}-output-true`, label: 'True', type: 'image' }, { id: `${id}-output-false`, label: 'False', type: 'image' }] } };
    case NodeType.OUTPUT_DISPLAY:
      return { ...baseNode, data: { ...baseNode.data, label: 'Output', width: 350, inputs: [{ id: `${id}-input`, label: 'Input', type: 'any' }, { id: `${id}-input-prompt`, label: 'Prompt', type: 'text' }] } };
    case NodeType.PROMPT_PRESET:
        if (!presetId || !PRESET_CONFIGS[presetId]) {
            throw new Error(`Unknown presetId: ${presetId}`);
        }
        const config = PRESET_CONFIGS[presetId];
        const inputs = config.inputs.map((input, index) => ({ ...input, id: `${id}-input-${index}`}));
        const outputs = config.outputs.map((output, index) => ({ ...output, id: `${id}-output-${index}`}));
        return { ...baseNode, data: { ...baseNode.data, label: config.label, prompt: config.prompt, inputs, outputs } };
    default:
      throw new Error("Unknown node type");
  }
};

const getRandomColor = () => {
    const colors = [
        'rgba(239, 68, 68, 0.1)', // red
        'rgba(249, 115, 22, 0.1)', // orange
        'rgba(234, 179, 8, 0.1)', // amber
        'rgba(132, 204, 22, 0.1)', // lime
        'rgba(34, 197, 94, 0.1)', // green
        'rgba(16, 185, 129, 0.1)', // emerald
        'rgba(20, 184, 166, 0.1)', // teal
        'rgba(6, 182, 212, 0.1)', // cyan
        'rgba(59, 130, 246, 0.1)', // blue
        'rgba(139, 92, 246, 0.1)', // violet
        'rgba(168, 85, 247, 0.1)', // purple
        'rgba(217, 70, 239, 0.1)', // fuchsia
        'rgba(236, 72, 153, 0.1)', // pink
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

const WORKFLOW_STORAGE_KEY = 'bananaflow-workflow';

const getImageDimensionsFromSource = (imageSource: File | string | { dataUrl: string, name: string }): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
      const img = new Image();
      let objectUrl: string | null = null;
      img.onload = () => {
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
          if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
      img.onerror = (e) => {
          reject(new Error(`Could not load image to get dimensions. Error: ${String(e)}`));
          if (objectUrl) URL.revokeObjectURL(objectUrl);
      };

      if (imageSource instanceof File) {
          objectUrl = URL.createObjectURL(imageSource);
          img.src = objectUrl;
      } else if (typeof imageSource === 'string' && (imageSource.startsWith('data:image') || imageSource.startsWith('blob:'))) {
          img.src = imageSource;
      } else if (imageSource && typeof imageSource === 'object' && imageSource.dataUrl) {
          img.src = imageSource.dataUrl;
      } else {
          reject(new Error("Unsupported image format for dimension check."));
      }
  });
};

const App: React.FC = () => {
  const { state: workflowState, setState: setWorkflowState, resetState: resetWorkflowState, undo, redo, canUndo, canRedo } = useUndoableState<WorkflowState>({
    nodes: {},
    edges: {},
    groups: {},
  });
  const { nodes, edges, groups } = workflowState;

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [viewTransform, setViewTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [connectingEdgeEnd, setConnectingEdgeEnd] = useState<Point | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState(new Set<string>());
  const [selectionBoxDiv, setSelectionBoxDiv] = useState<{ top: number; left: number; width: number; height: number; } | null>(null);
  const [alignmentConfig, setAlignmentConfig] = useState<AlignmentConfig>({
    gridSize: 20,
    snapThreshold: 8,
    guideThreshold: 10,
    enabled: true,
  });
  const [showAlignmentGuides, setShowAlignmentGuides] = useState(true);
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);
  
  const dragInfo = useRef<{ initialPositions: Map<string, Point>; startMousePos: Point; } | null>(null);
  const clipboard = useRef<{ nodes: Node[], edges: Edge[] } | null>(null);
  const connectingEdge = useRef<{ sourceNodeId: string; sourceHandleId: string; } | null>(null);
  const panState = useRef<{ startX: number; startY: number; startViewX: number; startViewY: number; } | null>(null);
  const resizingNode = useRef<{ id: string, startX: number, startWidth: number } | null>(null);
  const selectionBox = useRef<{ start: Point; end: Point; } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSpacebarDown = useRef(false);

  const setNodes = useCallback((updater: React.SetStateAction<Record<string, Node>>) => {
    setWorkflowState(prev => {
        const newNodes = typeof updater === 'function' ? updater(prev.nodes) : updater;
        return {...prev, nodes: newNodes};
    });
  }, [setWorkflowState]);

  const setEdges = useCallback((updater: (prev: Record<string, Edge>) => Record<string, Edge>) => {
    setWorkflowState(prev => ({...prev, edges: updater(prev.edges)}));
  }, [setWorkflowState]);
  const setGroups = useCallback((updater: (prev: Record<string, Group>) => Record<string, Group>) => {
    setWorkflowState(prev => ({...prev, groups: updater(prev.groups)}));
  }, [setWorkflowState]);

  useEffect(() => {
    try {
        const savedStateJSON = localStorage.getItem(WORKFLOW_STORAGE_KEY);
        if (savedStateJSON) {
            const savedState = JSON.parse(savedStateJSON);
            if (savedState.workflow) resetWorkflowState(savedState.workflow);
            if (savedState.viewTransform) setViewTransform(savedState.viewTransform);
        }
    } catch (error) {
        console.error("Failed to load workflow from localStorage", error);
    }
  }, [resetWorkflowState]);

  useEffect(() => {
     try {
        const workflowToSave = JSON.parse(JSON.stringify(workflowState));

        for (const nodeId in workflowToSave.nodes) {
            const node = workflowToSave.nodes[nodeId];
            if ((node.type === NodeType.IMAGE_INPUT || node.type === NodeType.OUTPUT_DISPLAY) && node.data.content) {
                node.data.content = null;
            }
             if (node.type === NodeType.VIDEO_GENERATOR && node.data.content) {
                node.data.content = null;
            }
        }
        
        const stateToSave = {
            workflow: workflowToSave,
            viewTransform,
        };
        
        localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(stateToSave));
     } catch (error) {
        console.error("Failed to save workflow to localStorage", error);
     }
  }, [workflowState, viewTransform]);

  const updateCursor = useCallback(() => {
    if (!canvasRef.current) return;
    if (panState.current) {
        canvasRef.current.style.cursor = 'grabbing';
    } else if (isSpacebarDown.current) {
        canvasRef.current.style.cursor = 'grab';
    } else {
        canvasRef.current.style.cursor = 'default';
    }
  }, []);

  const addNode = useCallback((type: NodeType, presetId?: string) => {
    const newNode = createNode(type, { 
        x: (300 - viewTransform.x) / viewTransform.scale, 
        y: (150 - viewTransform.y) / viewTransform.scale
    }, presetId);
    setNodes(prev => ({ ...prev, [newNode.id]: newNode }));
  }, [viewTransform, setNodes]);

  const updateNodeData = useCallback((nodeId: string, data: Partial<Node['data']>) => {
    setNodes(prev => {
        if (!prev[nodeId]) return prev;
        const currentNode = prev[nodeId];
        const updatedNode = { ...currentNode, data: { ...currentNode.data, ...data } };
        return { ...prev, [nodeId]: updatedNode };
    });
  }, [setNodes]);

  const updateGroup = useCallback((groupId: string, data: Partial<Group>) => {
    setGroups(prev => {
        if (!prev[groupId]) return prev;
        return { ...prev, [groupId]: { ...prev[groupId], ...data } };
    });
  }, [setGroups]);
  
  const getHandlePosition = useCallback((nodeId: string, handleId: string): Point => {
    const handleElem = document.getElementById(handleId);
    if (!handleElem || !canvasRef.current) return { x: 0, y: 0 };
    
    const handleRect = handleElem.getBoundingClientRect();
    const canvasRect = canvasRef.current.getBoundingClientRect();

    const screenX = handleRect.left + handleRect.width / 2 - canvasRect.left;
    const screenY = handleRect.top + handleRect.height / 2 - canvasRect.top;
    
    const worldX = (screenX - viewTransform.x) / viewTransform.scale;
    const worldY = (screenY - viewTransform.y) / viewTransform.scale;

    return { x: worldX, y: worldY };
  }, [viewTransform]);

  const handleMouseDownNode = useCallback((e: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement || (e.target as HTMLElement).closest('button')) return;
    e.stopPropagation();
    
    resizingNode.current = null;

    const newSelectedIds = (() => {
        if (e.shiftKey) {
            const newSet = new Set(selectedNodeIds);
            if (newSet.has(nodeId)) newSet.delete(nodeId);
            else newSet.add(nodeId);
            return newSet;
        } else {
            return selectedNodeIds.has(nodeId) ? selectedNodeIds : new Set([nodeId]);
        }
    })();
    setSelectedNodeIds(newSelectedIds);
    
    const initialPositions = new Map<string, Point>();
    newSelectedIds.forEach(id => {
        if(nodes[id]) initialPositions.set(id, nodes[id].position);
    });

    setIsDragging(true);
    dragInfo.current = {
      initialPositions,
      startMousePos: { x: e.clientX, y: e.clientY },
    };
  }, [nodes, selectedNodeIds]);

  const handleMouseDownHandle = useCallback((e: React.MouseEvent<HTMLDivElement>, nodeId: string, handleId: string, handleType: 'input' | 'output') => {
    e.stopPropagation();
    if (handleType === 'output') {
      connectingEdge.current = { sourceNodeId: nodeId, sourceHandleId: handleId };
      setConnectingEdgeEnd(getHandlePosition(nodeId, handleId));
    } else if (handleType === 'input') {
        const connectedEdge = Object.values(edges).find(
            edge => edge.targetNodeId === nodeId && edge.targetHandleId === handleId
        );

        if (connectedEdge) {
            connectingEdge.current = {
                sourceNodeId: connectedEdge.sourceNodeId,
                sourceHandleId: connectedEdge.sourceHandleId,
            };
            setConnectingEdgeEnd(getHandlePosition(connectedEdge.sourceNodeId, connectedEdge.sourceHandleId));
            setEdges(prev => {
                const newEdges = { ...prev };
                delete newEdges[connectedEdge.id];
                return newEdges;
            });
        }
    }
  }, [getHandlePosition, edges, setEdges]);

   const handleResizeMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    e.stopPropagation();
    dragInfo.current = null;
    resizingNode.current = {
        id: nodeId,
        startX: e.clientX,
        startWidth: nodes[nodeId].data.width || 250,
    };
   },[nodes]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === ' ' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
            e.preventDefault();
            if (!isSpacebarDown.current) {
                isSpacebarDown.current = true;
                updateCursor();
            }
        }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === ' ') {
            e.preventDefault();
            isSpacebarDown.current = false;
            updateCursor();
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [updateCursor]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (selectionBox.current && canvasRef.current) {
            const canvasRect = canvasRef.current.getBoundingClientRect();
            selectionBox.current.end = { x: e.clientX - canvasRect.left, y: e.clientY - canvasRect.top };
            const { start, end } = selectionBox.current;
            const left = Math.min(start.x, end.x);
            const top = Math.min(start.y, end.y);
            const width = Math.abs(start.x - end.x);
            const height = Math.abs(start.y - end.y);
            setSelectionBoxDiv({ left, top, width, height });
        } else if (resizingNode.current) {
            const { id, startX, startWidth } = resizingNode.current;
            const dx = e.clientX - startX;
            const newWidth = Math.max(150, startWidth + dx);
            updateNodeData(id, { width: newWidth });
        } else if (panState.current) {
            const currentPanState = panState.current;
            const dx = e.clientX - currentPanState.startX;
            const dy = e.clientY - currentPanState.startY;
            setViewTransform(prev => ({
                ...prev,
                x: currentPanState.startViewX + dx,
                y: currentPanState.startViewY + dy,
            }));
        } else if (dragInfo.current) {
            const { initialPositions, startMousePos } = dragInfo.current;
            const dx = (e.clientX - startMousePos.x) / viewTransform.scale;
            const dy = (e.clientY - startMousePos.y) / viewTransform.scale;

            setNodes(prev => {
                const newNodes = { ...prev };
                const selectedNodeIdsArray = Array.from(selectedNodeIds);
                
                // 只对第一个选中的节点应用对齐（通常是主拖拽节点）
                if (selectedNodeIdsArray.length > 0) {
                    const primaryNodeId = selectedNodeIdsArray[0];
                    const primaryNode = newNodes[primaryNodeId];
                    
                    if (primaryNode) {
                        const newPosition = { x: initialPositions.get(primaryNodeId)!.x + dx, y: initialPositions.get(primaryNodeId)!.y + dy };
                        
                        // 创建其他节点的边界信息用于对齐计算
                        const otherNodes = Object.values(newNodes)
                            .filter(node => node.id !== primaryNodeId)
                            .map(node => createNodeBounds(node));
                        
                        // 创建当前拖拽节点的边界信息
                        const draggedNode = createNodeBounds({
                            ...primaryNode,
                            position: newPosition
                        });
                        
                        // 应用对齐
                        const alignmentResult = applyAlignment(newPosition, draggedNode, otherNodes, alignmentConfig);
                        
                        // 更新对齐线显示（根据开关状态）
                        setAlignmentGuides(showAlignmentGuides ? alignmentResult.guides : []);
                        
                        // 计算所有选中节点的相对偏移
                        const primaryOffset = {
                            x: alignmentResult.position.x - initialPositions.get(primaryNodeId)!.x,
                            y: alignmentResult.position.y - initialPositions.get(primaryNodeId)!.y
                        };
                        
                        // 应用偏移到所有选中的节点
                        initialPositions.forEach((startPos, id) => {
                            if (newNodes[id]) {
                                newNodes[id] = {
                                    ...newNodes[id],
                                    position: { 
                                        x: startPos.x + primaryOffset.x, 
                                        y: startPos.y + primaryOffset.y 
                                    }
                                };
                            }
                        });
                    }
                } else {
                    // 如果没有选中节点，使用原始逻辑
                    initialPositions.forEach((startPos, id) => {
                        if (newNodes[id]) {
                            newNodes[id] = {
                                ...newNodes[id],
                                position: { x: startPos.x + dx, y: startPos.y + dy }
                            };
                        }
                    });
                }
                
                return newNodes;
            });
        } else if (connectingEdge.current) {
            const canvasRect = canvasRef.current?.getBoundingClientRect();
            if(canvasRect) {
                const worldX = (e.clientX - canvasRect.left - viewTransform.x) / viewTransform.scale;
                const worldY = (e.clientY - canvasRect.top - viewTransform.y) / viewTransform.scale;
                setConnectingEdgeEnd({ x: worldX, y: worldY });
            }
        }
    };

    const handleMouseUp = (e: MouseEvent) => {
        if (selectionBox.current && canvasRef.current) {
            const { start, end } = selectionBox.current; // These are canvas-relative

            const boxStartWorld = {
                x: (Math.min(start.x, end.x) - viewTransform.x) / viewTransform.scale,
                y: (Math.min(start.y, end.y) - viewTransform.y) / viewTransform.scale
            };
            const boxEndWorld = {
                x: (Math.max(start.x, end.x) - viewTransform.x) / viewTransform.scale,
                y: (Math.max(start.y, end.y) - viewTransform.y) / viewTransform.scale
            };
            
            const newSelectedIds = e.shiftKey ? new Set(selectedNodeIds) : new Set<string>();
            Object.values(nodes).forEach(node => {
                const nodeElem = document.querySelector(`[data-node-id='${node.id}']`);
                if (!nodeElem) return;

                const nodeWidth = nodeElem.clientWidth;
                const nodeHeight = nodeElem.clientHeight;
                
                const nodeLeft = node.position.x;
                const nodeRight = node.position.x + nodeWidth;
                const nodeTop = node.position.y;
                const nodeBottom = node.position.y + nodeHeight;

                if (nodeRight > boxStartWorld.x && nodeLeft < boxEndWorld.x && nodeBottom > boxStartWorld.y && nodeTop < boxEndWorld.y) {
                    if (newSelectedIds.has(node.id) && e.shiftKey) {
                        newSelectedIds.delete(node.id);
                    } else {
                        newSelectedIds.add(node.id);
                    }
                }
            });
            setSelectedNodeIds(newSelectedIds);
        } else if (connectingEdge.current) {
            const target = e.target as HTMLElement;
            const targetHandle = target.closest('[data-handle-type="input"]');

            if (targetHandle) {
                const targetHandleId = targetHandle.id;
                const targetNodeElement = targetHandle.closest('[data-node-id]');
                const targetNodeId = targetNodeElement?.getAttribute('data-node-id');
                const { sourceNodeId, sourceHandleId } = connectingEdge.current;
                
                if (targetNodeId && sourceNodeId !== targetNodeId) {
                    const newEdge: Edge = {
                        id: crypto.randomUUID(),
                        sourceNodeId,
                        sourceHandleId,
                        targetNodeId,
                        targetHandleId,
                    };
                    setEdges(prev => ({ ...prev, [newEdge.id]: newEdge }));
                }
            }
        }
        
        selectionBox.current = null;
        setSelectionBoxDiv(null);
        if (resizingNode.current) {
            setNodes(prev => ({...prev}));
        }
        if (dragInfo.current) {
            setIsDragging(false);
            setNodes(prev => ({...prev}));
        }
        dragInfo.current = null;
        setAlignmentGuides([]);
        connectingEdge.current = null;
        panState.current = null;
        resizingNode.current = null;
        setConnectingEdgeEnd(null);
        updateCursor();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [viewTransform, updateNodeData, nodes, selectedNodeIds, updateCursor, setNodes, setEdges]);
  
   const zoomCanvas = useCallback((deltaY: number, anchorPoint: Point) => {
        const zoomFactor = 1.1;
        if (!canvasRef.current) return;
        
        const newScale = deltaY < 0 ? viewTransform.scale * zoomFactor : viewTransform.scale / zoomFactor;
        const clampedScale = Math.max(0.2, Math.min(2.5, newScale));

        const worldX = (anchorPoint.x - viewTransform.x) / viewTransform.scale;
        const worldY = (anchorPoint.y - viewTransform.y) / viewTransform.scale;

        const newX = anchorPoint.x - worldX * clampedScale;
        const newY = anchorPoint.y - worldY * clampedScale;

        setViewTransform({ scale: clampedScale, x: newX, y: newY });
   }, [viewTransform]);

   useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement || e.key === ' ') return;

      const isModKey = e.ctrlKey || e.metaKey;
      
      if (isModKey && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
          return;
      }
      
      if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          if (!canvasRef.current) return;
          const { width, height } = canvasRef.current.getBoundingClientRect();
          zoomCanvas(-1, {x: width / 2, y: height / 2});
      }
      if (e.key === '-') {
          e.preventDefault();
          if (!canvasRef.current) return;
          const { width, height } = canvasRef.current.getBoundingClientRect();
          zoomCanvas(1, {x: width / 2, y: height / 2});
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIds.size > 0) {
            setWorkflowState(prev => {
                const newNodes = { ...prev.nodes };
                const newEdges = { ...prev.edges };
                const newGroups = { ...prev.groups };

                selectedNodeIds.forEach(id => delete newNodes[id]);

                Object.values(newEdges).forEach(edge => {
                    if (selectedNodeIds.has(edge.sourceNodeId) || selectedNodeIds.has(edge.targetNodeId)) {
                        delete newEdges[edge.id];
                    }
                });

                Object.values(newGroups).forEach(group => {
                    const newNodeIds = group.nodeIds.filter(id => !selectedNodeIds.has(id));
                    if (newNodeIds.length === 0) {
                        delete newGroups[group.id];
                    } else {
                        newGroups[group.id].nodeIds = newNodeIds;
                    }
                });
                return { nodes: newNodes, edges: newEdges, groups: newGroups };
            });
            setSelectedNodeIds(new Set());
        }
      }
      
      if (isModKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (e.shiftKey) { // Ungroup
            setGroups(prevGroups => {
                const newGroups = {...prevGroups};
                const groupsToUpdate = new Set<string>();
                selectedNodeIds.forEach(nodeId => {
                    for (const groupId in newGroups) {
                        if (newGroups[groupId].nodeIds.includes(nodeId)) {
                            groupsToUpdate.add(groupId);
                        }
                    }
                });

                groupsToUpdate.forEach(groupId => {
                    const group = newGroups[groupId];
                    const newNodeIds = group.nodeIds.filter(id => !selectedNodeIds.has(id));
                    if (newNodeIds.length === 0) {
                        delete newGroups[groupId];
                    } else {
                        group.nodeIds = newNodeIds;
                    }
                });
                return newGroups;
            });

        } else { // Group
            if (selectedNodeIds.size > 0) {
                const newGroup: Group = {
                    id: crypto.randomUUID(),
                    label: 'New Group',
                    color: getRandomColor(),
                    nodeIds: Array.from(selectedNodeIds),
                };
                setGroups(prev => ({...prev, [newGroup.id]: newGroup}));
            }
        }
      }

      if (isModKey && e.key.toLowerCase() === 'm') {
          e.preventDefault();
          setNodes(prev => {
              const newNodes = { ...prev };
              selectedNodeIds.forEach(id => {
                  if (newNodes[id]) {
                      newNodes[id] = {...newNodes[id], data: {...newNodes[id].data, isMuted: !newNodes[id].data.isMuted}};
                  }
              });
              return newNodes;
          });
      }
      
      if (isModKey && e.key.toLowerCase() === 'c') {
          const nodesToCopy = Object.values(nodes).filter(n => selectedNodeIds.has(n.id));
          const edgesToCopy = Object.values(edges).filter(e => selectedNodeIds.has(e.sourceNodeId) && selectedNodeIds.has(e.targetNodeId));
          clipboard.current = { nodes: nodesToCopy, edges: edgesToCopy };
      }
      
      if (isModKey && e.key.toLowerCase() === 'v') {
          if (!clipboard.current) return;
          const { nodes: nodesToPaste, edges: edgesToPaste } = clipboard.current;
          const idMap = new Map<string, string>();
          const newPastedNodes: Record<string, Node> = {};
          const newSelectedIds = new Set<string>();

          nodesToPaste.forEach(node => {
              const oldId = node.id;
              const newId = crypto.randomUUID();
              idMap.set(oldId, newId);
              newSelectedIds.add(newId);

              const newNode: Node = {
                  ...node,
                  id: newId,
                  position: { x: node.position.x + 30, y: node.position.y + 30 },
                  data: {
                      ...node.data,
                      inputs: node.data.inputs.map(i => ({ ...i, id: i.id.replace(oldId, newId) })),
                      outputs: node.data.outputs.map(o => ({ ...o, id: o.id.replace(oldId, newId) })),
                  }
              };
              newPastedNodes[newId] = newNode;
          });

          const newPastedEdges: Record<string, Edge> = {};
          edgesToPaste.forEach(edge => {
              const newEdgeId = crypto.randomUUID();
              const newSourceNodeId = idMap.get(edge.sourceNodeId)!;
              const newTargetNodeId = idMap.get(edge.targetNodeId)!;
              
              const newEdge: Edge = {
                  id: newEdgeId,
                  sourceNodeId: newSourceNodeId,
                  targetNodeId: newTargetNodeId,
                  sourceHandleId: edge.sourceHandleId.replace(edge.sourceNodeId, newSourceNodeId),
                  targetHandleId: edge.targetHandleId.replace(edge.targetNodeId, newTargetNodeId),
              };
              newPastedEdges[newEdgeId] = newEdge;
          });
          
          setWorkflowState(prev => ({
              ...prev,
              nodes: {...prev.nodes, ...newPastedNodes},
              edges: {...prev.edges, ...newPastedEdges}
          }));
          setSelectedNodeIds(newSelectedIds);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges, selectedNodeIds, undo, redo, zoomCanvas, setWorkflowState, setNodes, setEdges, setGroups]);

  const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault();
      const isModKey = e.ctrlKey || e.metaKey;

      if (isModKey) {
        if (!canvasRef.current) return;
        const { left, top } = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - left;
        const mouseY = e.clientY - top;
        zoomCanvas(e.deltaY, { x: mouseX, y: mouseY });
      } else {
        setViewTransform(prev => ({
            ...prev,
            x: prev.x - e.deltaX,
            y: prev.y - e.deltaY
        }));
      }
  };
  
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey) || (e.button === 0 && isSpacebarDown.current)) {
          panState.current = {
            startX: e.clientX,
            startY: e.clientY,
            startViewX: viewTransform.x,
            startViewY: viewTransform.y,
          };
          updateCursor();
          return;
      }

      const targetEl = e.target as HTMLElement;
      if (targetEl.closest('[data-node-id]') || targetEl.closest('g')) {
          return;
      }

      if (e.button === 0) {
          if (!canvasRef.current) return;
          const canvasRect = canvasRef.current.getBoundingClientRect();
          const startPos = {
              x: e.clientX - canvasRect.left,
              y: e.clientY - canvasRect.top
          };
          selectionBox.current = { 
              start: startPos,
              end: startPos
          };
          if (!e.shiftKey) {
            setSelectedNodeIds(new Set());
          }
      }
  };

  const downloadWorkflow = () => {
      const workflow = {
          workflow: workflowState,
          viewTransform
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(workflow, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "workflow.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const uploadWorkflow = () => {
      fileInputRef.current?.click();
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const savedState = JSON.parse(event.target?.result as string);
              if (savedState.workflow && savedState.workflow.nodes) {
                  resetWorkflowState(savedState.workflow);
                  setViewTransform(savedState.viewTransform || { scale: 1, x: 0, y: 0 });
                  setSelectedNodeIds(new Set());
              } else {
                  alert("Invalid workflow file format.");
              }
          } catch (error) {
              alert("Error reading workflow file.");
              console.error(error);
          }
      };
      reader.readAsText(file);
      e.target.value = ''; 
  };

  const runWorkflow = useCallback(async () => {
    setIsProcessing(true);
    
    const initialNodes: Record<string, Node> = {};
    for (const nodeId in nodes) {
        const node = nodes[nodeId];
        const data = { ...node.data, status: NodeStatus.IDLE, errorMessage: undefined, progressMessage: "" };
        if (node.type !== NodeType.TEXT_INPUT && node.type !== NodeType.IMAGE_INPUT) {
            data.content = null;
        }
        initialNodes[nodeId] = { ...node, data };
    }
    setNodes(initialNodes);
    
    await new Promise(resolve => setTimeout(resolve, 0));

    const nodesToRun = JSON.parse(JSON.stringify(initialNodes));

    const nodeIds = Object.keys(nodesToRun);
    const adj: Record<string, string[]> = nodeIds.reduce((acc, id) => ({ ...acc, [id]: [] }), {});
    const inDegree: Record<string, number> = nodeIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {});

    Object.values(edges).forEach(edge => {
      adj[edge.sourceNodeId].push(edge.targetNodeId);
      inDegree[edge.targetNodeId]++;
    });

    const queue = nodeIds.filter(id => inDegree[id] === 0);
    const executionOrder: string[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      executionOrder.push(u);
      adj[u]?.forEach(v => {
        inDegree[v]--;
        if (inDegree[v] === 0) queue.push(v);
      });
    }

    const nodeOutputs: Record<string, any> = {};

    for (const nodeId of executionOrder) {
      const node = nodesToRun[nodeId];
      if (!node) continue;
      
      const inputEdges = Object.values(edges).filter(e => e.targetNodeId === nodeId);
      const inputs: Record<string, any> = {};
      for (const edge of inputEdges) {
          inputs[edge.targetHandleId] = nodeOutputs[edge.sourceHandleId];
      }
      
      const activeInputEdges = inputEdges.filter(edge => nodeOutputs.hasOwnProperty(edge.sourceHandleId));
      
      // 检查节点是否可以运行
      let canRun = false;
      if (node.type === NodeType.CONDITIONAL) {
          canRun = activeInputEdges.length > 0;
      } else if (node.type === NodeType.PROMPT_PRESET) {
          // 预设节点：如果有输入连接就运行，没有就跳过
          canRun = activeInputEdges.length > 0;
      } else if (node.type === NodeType.IMAGE_EDITOR) {
          // 图片编辑器：至少需要图片输入，文本输入可选
          const hasImageInput = inputEdges.some(edge => 
              activeInputEdges.some(activeEdge => activeEdge.id === edge.id) &&
              edge.targetHandleId.includes('input-image')
          );
          canRun = hasImageInput;
      } else {
          // 其他节点：需要所有输入都有数据
          canRun = activeInputEdges.length >= inputEdges.length;
      }
      
      if (!canRun) {
          // 不符合运行条件的节点，标记为等待状态并跳过
          updateNodeData(nodeId, { 
              status: NodeStatus.IDLE, 
              progressMessage: inputEdges.length > 0 ? "等待输入..." : "需要连接输入" 
          });
          continue;
      }

      if (node.data.isMuted) {
          updateNodeData(nodeId, { status: NodeStatus.COMPLETED });
          const firstInputHandle = node.data.inputs[0];
          if (firstInputHandle) {
              const inputValue = inputs[firstInputHandle.id];
              node.data.outputs.forEach(outputHandle => {
                  nodeOutputs[outputHandle.id] = inputValue;
              });
          }
          continue;
      }
      
      updateNodeData(nodeId, { status: NodeStatus.PROCESSING, progressMessage: 'Starting...' });

      try {
        let outputContent: any = null;

        const processImageInput = async (imageInput: any): Promise<{ data: string; mimeType: string; name?: string } | null> => {
            if (!imageInput) return null;
            if (imageInput.dataUrl) {
                 const [meta, base64] = imageInput.dataUrl.split(',');
                const mimeType = meta.split(':')[1].split(';')[0];
                return { data: base64, mimeType, name: imageInput.name };
            }
            if (typeof imageInput === 'string' && imageInput.startsWith('data:image')) {
                const [meta, base64] = imageInput.split(',');
                const mimeType = meta.split(':')[1].split(';')[0];
                return { data: base64, mimeType };
            }
             if (typeof imageInput === 'string' && imageInput.startsWith('blob:')) {
                return { data: imageInput, mimeType: 'video/mp4' };
            }
            return null;
        }

        switch (node.type) {
            case NodeType.TEXT_INPUT:
            case NodeType.IMAGE_INPUT:
              outputContent = node.data.content;
              node.data.outputs.forEach(output => {
                nodeOutputs[output.id] = outputContent;
              });
              break;
            case NodeType.TEXT_GENERATOR: {
              const prompt = inputs[`${nodeId}-input`];
              outputContent = await geminiService.generateText(prompt);
              node.data.outputs.forEach(output => {
                nodeOutputs[output.id] = outputContent;
              });
              break;
            }
            case NodeType.IMAGE_EDITOR: {
              const imageInput = inputs[`${nodeId}-input-image`];
              const textInput = inputs[`${nodeId}-input-text`];
              const imageFile = await processImageInput(imageInput);

              if (imageFile) {
                  const result = await geminiService.editImage(imageFile.data, imageFile.mimeType, textInput);
                  if (result && result.newBase64Image) {
                      const mimeType = result.mimeType || imageFile.mimeType;
                      const dataUrl = `data:${mimeType};base64,${result.newBase64Image}`;
                      outputContent = { image: dataUrl, text: result.text };
                      
                      const newImageOutput = {
                        dataUrl: dataUrl,
                        name: imageFile.name ? imageFile.name.replace(/(\.[\w\d_-]+)$/i, '_edited$1') : `generated-${Date.now()}.png`,
                        prompt: textInput,
                      };

                      node.data.outputs.forEach(output => {
                        if (output.type === 'image' || output.id.endsWith('image')) {
                          nodeOutputs[output.id] = newImageOutput;
                        } else if (output.type === 'text' || output.id.endsWith('text')) {
                          nodeOutputs[output.id] = result.text;
                        }
                      });

                  } else {
                      throw new Error(result.text || "Image editing failed to produce an image.");
                  }
              } else {
                  throw new Error("Missing image for Image Editor.");
              }
              break;
            }
            case NodeType.PROMPT_PRESET: {
                const imageInputsRaw = node.data.inputs.map(input => inputs[input.id]);
                const imageFilesPromises = imageInputsRaw.map(processImageInput);
                const imageFiles = (await Promise.all(imageFilesPromises)).filter(Boolean) as {data: string, mimeType: string, name?: string}[];
                
                if (imageFiles.length > 0 && node.data.prompt) {
                    const result = await geminiService.executePreset(imageFiles, node.data.prompt);
                     if (result && result.newBase64Image) {
                      const mimeType = result.mimeType || imageFiles[0].mimeType;
                      const dataUrl = `data:${mimeType};base64,${result.newBase64Image}`;
                      outputContent = { image: dataUrl, text: result.text };

                      const newImageOutput = {
                        dataUrl: dataUrl,
                        name: imageFiles[0]?.name ? imageFiles[0].name.replace(/(\.[\w\d_-]+)$/i, '_preset$1') : `generated-${Date.now()}.png`,
                        prompt: node.data.prompt,
                      };

                      node.data.outputs.forEach(output => {
                          if (output.type === 'image' || output.type === 'any') {
                             nodeOutputs[output.id] = newImageOutput;
                          } else if(output.type === 'text') {
                             nodeOutputs[output.id] = result.text;
                          }
                      });

                  } else {
                      throw new Error(result.text || "Preset failed to produce an image.");
                  }
                } else {
                    throw new Error(`Missing required inputs for preset: ${node.data.label}`);
                }
                break;
            }
            case NodeType.VIDEO_GENERATOR: {
              const imageInput = inputs[`${nodeId}-input-image`];
              const textInput = inputs[`${nodeId}-input-text`];
              const imageFile = await processImageInput(imageInput);

              outputContent = await geminiService.generateVideo(
                  imageFile?.data || null,
                  imageFile?.mimeType || null,
                  textInput,
                  (progress) => { updateNodeData(nodeId, { progressMessage: progress }); }
              );
              node.data.outputs.forEach(output => {
                nodeOutputs[output.id] = outputContent;
              });
              break;
            }
            case NodeType.CONDITIONAL: {
              const imageInput = inputs[`${nodeId}-input-image`];
              const conditionString = inputs[`${nodeId}-input-prompt`];
              
              if (!imageInput) {
                  throw new Error("Missing image for Conditional node.");
              }
              if (typeof conditionString !== 'string') {
                  throw new Error(`Condition must be text. Received: ${typeof conditionString}`);
              }
              
              const dimensions = await getImageDimensionsFromSource(imageInput);
              
              let conditionResult = false;
              try {
                  const evaluateCondition = new Function('input', `return ${conditionString}`);
                  conditionResult = !!evaluateCondition({ width: dimensions.width, height: dimensions.height });
              } catch (e) {
                  throw new Error(`Condition evaluation failed: ${(e as Error).message}`);
              }

              outputContent = `Condition Result: ${conditionResult}`;

              node.data.outputs.forEach(output => {
                  const isTrueHandle = output.id === `${nodeId}-output-true`;
                  const isFalseHandle = output.id === `${nodeId}-output-false`;

                  if (conditionResult && isTrueHandle) {
                      nodeOutputs[output.id] = imageInput;
                  } else if (!conditionResult && isFalseHandle) {
                      nodeOutputs[output.id] = imageInput;
                  }
              });
              break;
            }
            case NodeType.OUTPUT_DISPLAY: {
              const rawInput = inputs[`${nodeId}-input`];
              const cropPrompt = inputs[`${nodeId}-input-prompt`];
              
              if (rawInput && typeof rawInput === 'object' && rawInput.dataUrl && rawInput.dataUrl.startsWith('data:image')) {
                  const nameWithoutExt = rawInput.name.includes('.') ? rawInput.name.split('.').slice(0, -1).join('.') : rawInput.name;
                  outputContent = { image: rawInput.dataUrl, cropPrompt, originalName: nameWithoutExt };

              } else if (typeof rawInput === 'string' && rawInput.startsWith('data:image')) {
                   const originalName = `generated-${Date.now()}`;
                  outputContent = { image: rawInput, cropPrompt, originalName };

              } else {
                 outputContent = rawInput;
              }
              break;
            }
        }

        updateNodeData(nodeId, { status: NodeStatus.COMPLETED, content: outputContent, progressMessage: "" });

      } catch (error) {
        console.error("Workflow error at node", nodeId, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        updateNodeData(nodeId, { status: NodeStatus.ERROR, errorMessage, progressMessage: "" });
        setIsProcessing(false);
        return;
      }
    }

    setIsProcessing(false);
  }, [nodes, edges, updateNodeData, setNodes]);
  
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#1E1F22]">
      <Sidebar 
        onAddNode={addNode} 
        isCollapsed={isSidebarCollapsed} 
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)} 
      />
      <main
        className="h-full transition-all duration-300 ease-in-out"
        style={{ marginLeft: isSidebarCollapsed ? '0' : '16rem' }}
      >
        <div
          ref={canvasRef}
          className="relative w-full h-full cursor-default"
          onWheel={handleWheel}
          onMouseDown={handleCanvasMouseDown}
        >
          {selectionBoxDiv && (
              <div 
                  className="absolute bg-blue-500/20 border border-blue-400 pointer-events-none z-30"
                  style={{ ...selectionBoxDiv }}
              />
          )}
          <div className="absolute top-4 right-4 z-20 flex items-center space-x-3">
              <div className="flex items-center space-x-1 bg-[#282A2D] p-1 rounded-lg border border-white/10">
                  <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-colors disabled:text-gray-500 disabled:hover:bg-transparent"><UndoIcon className="w-5 h-5"/></button>
                  <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-colors disabled:text-gray-500 disabled:hover:bg-transparent"><RedoIcon className="w-5 h-5"/></button>
                  <div className="w-px h-5 bg-white/10 mx-1"></div>
                  <button onClick={downloadWorkflow} title="Save Workflow" className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"><SaveIcon className="w-5 h-5"/></button>
                  <button onClick={uploadWorkflow} title="Load Workflow" className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"><FolderOpenIcon className="w-5 h-5"/></button>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" style={{ display: 'none' }} />
              </div>
              
              {/* 对齐参考线设置 */}
              <div className="flex items-center space-x-1 bg-[#282A2D] p-1 rounded-lg border border-white/10">
                  <button 
                      onClick={() => setShowAlignmentGuides(prev => !prev)}
                      title={`${showAlignmentGuides ? 'Hide' : 'Show'} Alignment Guides`}
                      className={`p-2 rounded-md transition-colors ${
                          showAlignmentGuides 
                              ? 'text-blue-400 bg-blue-500/20' 
                              : 'text-gray-300 hover:text-white hover:bg-white/10'
                      }`}
                  >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                  </button>
              </div>
              <button
                  onClick={runWorkflow}
                  disabled={isProcessing}
                  className="flex items-center px-5 py-2.5 font-medium text-white bg-blue-600 rounded-lg shadow-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 ease-in-out"
              >
                  {isProcessing ? (
                      <>
                          <div className="w-5 h-5 mr-3 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                          Processing...
                      </>
                  ) : (
                      <>
                          <PlayIcon className="w-5 h-5 mr-2" />
                          Run Workflow
                      </>
                  )}
              </button>
          </div>
          
          <div
              className="absolute top-0 left-0 w-full h-full"
              style={{ 
                  transform: `translate(${viewTransform.x}px, ${viewTransform.y}px) scale(${viewTransform.scale})`,
                  transformOrigin: '0 0'
              }}
          >
              {Object.values(groups).map(group => (
                  <GroupComponent 
                      key={group.id}
                      group={group}
                      nodes={nodes}
                      updateGroup={updateGroup}
                  />
              ))}
              <svg className="absolute top-0 left-0 overflow-visible pointer-events-none" style={{ width: '100%', height: '100%' }}>
                {Object.entries(edges).map(([id, edge]) => {
                  const startPos = getHandlePosition(edge.sourceNodeId, edge.sourceHandleId);
                  const endPos = getHandlePosition(edge.targetNodeId, edge.targetHandleId);
                  return <EdgeComponent 
                      key={id}
                      id={id}
                      start={startPos}
                      end={endPos}
                  />;
                })}

                {connectingEdge.current && connectingEdgeEnd && (
                    <EdgeComponent 
                        id="connecting-edge"
                        start={getHandlePosition(connectingEdge.current.sourceNodeId, connectingEdge.current.sourceHandleId)} 
                        end={connectingEdgeEnd}
                    />
                )}

                {/* 对齐线 */}
                {alignmentGuides.map((guide, index) => {
                  if (guide.type === 'horizontal') {
                    return (
                      <line
                        key={`guide-h-${index}`}
                        x1={0}
                        y1={guide.position}
                        x2="100%"
                        y2={guide.position}
                        stroke="#3b82f6"
                        strokeWidth={1}
                        strokeDasharray="4,4"
                        opacity={0.8}
                      />
                    );
                  } else {
                    return (
                      <line
                        key={`guide-v-${index}`}
                        x1={guide.position}
                        y1={0}
                        x2={guide.position}
                        y2="100%"
                        stroke="#3b82f6"
                        strokeWidth={1}
                        strokeDasharray="4,4"
                        opacity={0.8}
                      />
                    );
                  }
                })}
              </svg>

              {Object.values(nodes).map(node => (
                   <NodeComponent
                      key={node.id}
                      node={node}
                      isSelected={selectedNodeIds.has(node.id)}
                      isDragging={isDragging && selectedNodeIds.has(node.id)}
                      onMouseDown={handleMouseDownNode}
                      onHandleMouseDown={handleMouseDownHandle}
                      onResizeMouseDown={handleResizeMouseDown}
                      updateNodeData={updateNodeData}
                   />
              ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
