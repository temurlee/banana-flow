import React, { useState, useEffect } from 'react';
import type { Group, Node } from '../types';

interface GroupComponentProps {
  group: Group;
  nodes: Record<string, Node>;
  updateGroup: (groupId: string, data: Partial<Group>) => void;
}

const GroupComponent: React.FC<GroupComponentProps> = ({ group, nodes, updateGroup }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(group.label);
  const [bounds, setBounds] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const groupNodes = group.nodeIds.map(id => nodes[id]).filter(Boolean);

  useEffect(() => {
    setLabel(group.label);
  }, [group.label]);

  useEffect(() => {
    if (groupNodes.length === 0) return;

    const padding = 20;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    let allNodesRendered = true;
    groupNodes.forEach(node => {
      const nodeElem = document.querySelector(`[data-node-id='${node.id}']`);
      if (!nodeElem) {
        allNodesRendered = false;
        return;
      }
      const nodeWidth = nodeElem.clientWidth;
      const nodeHeight = nodeElem.clientHeight;
      
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + nodeWidth);
      maxY = Math.max(maxY, node.position.y + nodeHeight);
    });

    if (allNodesRendered && isFinite(minX)) {
      setBounds({
        x: minX - padding,
        y: minY - padding - 30,
        width: maxX - minX + padding * 2,
        height: maxY - minY + padding * 2 + 30,
      });
    }
  }, [groupNodes.map(n => `${n.id}-${n.position.x}-${n.position.y}-${n.data.width || 250}`).join(',')]);


  if (groupNodes.length === 0 || bounds.width === 0) {
    return null;
  }
  
  const handleLabelBlur = () => {
    setIsEditing(false);
    updateGroup(group.id, { label });
  };

  return (
    <div
      className="absolute rounded-xl border border-white/10 pointer-events-none"
      style={{
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
        backgroundColor: group.color
      }}
    >
      {isEditing ? (
         <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleLabelBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleLabelBlur()}
          className="bg-transparent text-white font-bold text-lg px-4 py-2 w-full outline-none pointer-events-auto"
          autoFocus
        />
      ) : (
        <h3 
            className="text-white font-bold text-lg px-4 py-2 cursor-pointer pointer-events-auto"
            onDoubleClick={() => setIsEditing(true)}
        >
            {group.label}
        </h3>
      )}
    </div>
  );
};

export default GroupComponent;