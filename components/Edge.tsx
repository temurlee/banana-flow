
import React from 'react';
import type { Point } from '../types';

interface EdgeProps {
  id: string;
  start: Point;
  end: Point;
}

const getCurvePath = (start: Point, end: Point): string => {
  const dx = end.x - start.x;
  const curveFactor = Math.min(Math.abs(dx) * 0.4, 150);
  const controlPoint1 = { x: start.x + curveFactor, y: start.y };
  const controlPoint2 = { x: end.x - curveFactor, y: end.y };
  return `M${start.x},${start.y} C${controlPoint1.x},${controlPoint1.y} ${controlPoint2.x},${controlPoint2.y} ${end.x},${end.y}`;
};

const EdgeComponent: React.FC<EdgeProps> = ({ id, start, end }) => {
  if (!start || !end) return null;

  const path = getCurvePath(start, end);
  const strokeColor = '#52525B'; // zinc-600
  const strokeWidth = '2';

  return (
    <g>
      {/* Hitbox path */}
      <path
        d={path}
        stroke="transparent"
        strokeWidth="15"
        fill="none"
      />
      {/* Visible path */}
      <path
        d={path}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
};

export default React.memo(EdgeComponent);
