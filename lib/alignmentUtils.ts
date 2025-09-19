import { Point } from '../types';

export interface AlignmentConfig {
  gridSize: number;
  snapThreshold: number;
  guideThreshold: number;
  enabled: boolean;
}

export interface AlignmentResult {
  position: Point;
  snapToGrid: boolean;
  guides: AlignmentGuide[];
}

export interface AlignmentGuide {
  type: 'horizontal' | 'vertical';
  position: number;
  nodeId: string;
  alignmentType: 'top' | 'center' | 'bottom' | 'left' | 'right';
}

export interface NodeBounds {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEFAULT_CONFIG: AlignmentConfig = {
  gridSize: 20,
  snapThreshold: 8,
  guideThreshold: 10,
  enabled: true,
};

/**
 * 计算网格对齐位置
 */
export function snapToGrid(position: Point, config: AlignmentConfig = DEFAULT_CONFIG): Point {
  if (!config.enabled) return position;
  
  const { gridSize } = config;
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize,
  };
}

/**
 * 计算智能对齐线
 */
export function calculateAlignmentGuides(
  draggedNode: NodeBounds,
  otherNodes: NodeBounds[],
  config: AlignmentConfig = DEFAULT_CONFIG
): AlignmentGuide[] {
  if (!config.enabled) return [];
  
  const guides: AlignmentGuide[] = [];
  const { guideThreshold } = config;
  
  for (const node of otherNodes) {
    if (node.id === draggedNode.id) continue;
    
    // 水平对齐线
    const horizontalAlignments = [
      { type: 'top' as const, position: node.y },
      { type: 'center' as const, position: node.y + node.height / 2 },
      { type: 'bottom' as const, position: node.y + node.height },
    ];
    
    for (const alignment of horizontalAlignments) {
      const draggedPosition = draggedNode.y + (alignment.type === 'top' ? 0 : 
                                              alignment.type === 'center' ? draggedNode.height / 2 : 
                                              draggedNode.height);
      
      if (Math.abs(draggedPosition - alignment.position) <= guideThreshold) {
        guides.push({
          type: 'horizontal',
          position: alignment.position,
          nodeId: node.id,
          alignmentType: alignment.type,
        });
      }
    }
    
    // 垂直对齐线
    const verticalAlignments = [
      { type: 'left' as const, position: node.x },
      { type: 'center' as const, position: node.x + node.width / 2 },
      { type: 'right' as const, position: node.x + node.width },
    ];
    
    for (const alignment of verticalAlignments) {
      const draggedPosition = draggedNode.x + (alignment.type === 'left' ? 0 : 
                                              alignment.type === 'center' ? draggedNode.width / 2 : 
                                              draggedNode.width);
      
      if (Math.abs(draggedPosition - alignment.position) <= guideThreshold) {
        guides.push({
          type: 'vertical',
          position: alignment.position,
          nodeId: node.id,
          alignmentType: alignment.type,
        });
      }
    }
  }
  
  return guides;
}

/**
 * 应用对齐到位置
 */
export function applyAlignment(
  position: Point,
  draggedNode: NodeBounds,
  otherNodes: NodeBounds[],
  config: AlignmentConfig = DEFAULT_CONFIG
): AlignmentResult {
  if (!config.enabled) {
    return { position, snapToGrid: false, guides: [] };
  }
  
  // 计算网格对齐
  const gridSnappedPosition = snapToGrid(position, config);
  const isGridSnapped = Math.abs(position.x - gridSnappedPosition.x) <= config.snapThreshold ||
                       Math.abs(position.y - gridSnappedPosition.y) <= config.snapThreshold;
  
  // 计算智能对齐线
  const guides = calculateAlignmentGuides(draggedNode, otherNodes, config);
  
  // 应用智能对齐
  let finalPosition = isGridSnapped ? gridSnappedPosition : position;
  
  if (guides.length > 0) {
    // 优先使用智能对齐
    const horizontalGuide = guides.find(g => g.type === 'horizontal');
    const verticalGuide = guides.find(g => g.type === 'vertical');
    
    if (horizontalGuide) {
      const offset = horizontalGuide.alignmentType === 'top' ? 0 :
                    horizontalGuide.alignmentType === 'center' ? draggedNode.height / 2 :
                    draggedNode.height;
      finalPosition.y = horizontalGuide.position - offset;
    }
    
    if (verticalGuide) {
      const offset = verticalGuide.alignmentType === 'left' ? 0 :
                    verticalGuide.alignmentType === 'center' ? draggedNode.width / 2 :
                    draggedNode.width;
      finalPosition.x = verticalGuide.position - offset;
    }
  }
  
  return {
    position: finalPosition,
    snapToGrid: isGridSnapped,
    guides,
  };
}

/**
 * 从节点数据创建边界信息
 */
export function createNodeBounds(node: { id: string; position: Point; data: { width?: number } }): NodeBounds {
  return {
    id: node.id,
    x: node.position.x,
    y: node.position.y,
    width: node.data.width || 250,
    height: 120, // 假设节点高度为120px
  };
}
