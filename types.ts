// Fix: Added missing type definitions. This file previously contained duplicated service logic.
export interface Point {
  x: number;
  y: number;
}

export enum NodeStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export enum NodeType {
  TEXT_INPUT = 'TEXT_INPUT',
  IMAGE_INPUT = 'IMAGE_INPUT',
  TEXT_GENERATOR = 'TEXT_GENERATOR',
  IMAGE_EDITOR = 'IMAGE_EDITOR',
  VIDEO_GENERATOR = 'VIDEO_GENERATOR',
  OUTPUT_DISPLAY = 'OUTPUT_DISPLAY',
  PROMPT_PRESET = 'PROMPT_PRESET',
  CONDITIONAL = 'CONDITIONAL',
}

export interface NodeInput {
  id: string;
  label: string;
  type: 'text' | 'image' | 'video' | 'any';
}

export interface NodeOutput {
  id: string;
  label: string;
  type: 'text' | 'image' | 'video' | 'any';
}

export interface Node {
  id: string;
  type: NodeType;
  position: Point;
  data: {
    label: string;
    status: NodeStatus;
    content: any;
    errorMessage?: string;
    progressMessage?: string;
    inputs: NodeInput[];
    outputs: NodeOutput[];
    width?: number;
    isMuted: boolean;
    prompt?: string;
  };
}

export interface Edge {
  id: string;
  sourceNodeId: string;
  sourceHandleId: string;
  targetNodeId: string;
  targetHandleId:string;
}

export interface Group {
  id: string;
  label: string;
  color: string;
  nodeIds: string[];
}

// Fix: Add missing 'HistoryItem' type.
export interface HistoryItem {
  id: string;
  dataUrl: string;
  width?: number;
  height?: number;
  prompt?: string;
  originalName?: string;
  cropPrompt?: string;
}

// Batch download related types
export interface BatchDownloadImage {
  src: string;
  originalName: string;
  cropPrompt?: string;
  visualCrop?: {
    x: number;
    y: number;
    width: number;
    height: number;
    imageDisplayWidth: number;
    imageDisplayHeight: number;
  };
}

export interface BatchDownloadOptions {
  format: 'original' | 'jpeg' | 'png';
  images: BatchDownloadImage[];
}

export interface BatchDownloadProgress {
  current: number;
  total: number;
  currentFileName: string;
  isComplete: boolean;
  error?: string;
}
