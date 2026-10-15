export type BoardTemplate =
  | 'blank'
  | 'mindmap'
  | 'flowchart'
  | 'dbms'
  | 'math'
  | 'project'
  | 'study'
  | 'brainstorm'
  | 'exam';

export type BoardElementType =
  | 'stroke'
  | 'shape'
  | 'text'
  | 'sticky'
  | 'line'
  | 'arrow';

export type BoardShapeType =
  | 'rectangle'
  | 'rounded-rectangle'
  | 'circle'
  | 'ellipse'
  | 'diamond'
  | 'cylinder'
  | 'star'
  | 'triangle';

export type BoardLineType =
  | 'straight'
  | 'arrow'
  | 'double-arrow'
  | 'elbow';

export interface BoardPoint {
  x: number;
  y: number;
}

export interface BoardElement {
  id: string;
  type: BoardElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  color: string;
  fillColor?: string;
  strokeWidth: number;
  strokeType?: 'solid' | 'dashed';
  content?: string;
  fontSize?: number;
  fontFamily?: 'sans' | 'mono' | 'handwritten';
  points?: BoardPoint[];
  shapeType?: BoardShapeType;
  lineType?: BoardLineType;
  zIndex: number;
  authorId?: string;
  authorName?: string;
  updatedAt: number;
}

export interface IBoardRoom {
  _id?: string;
  code: string;
  title: string;
  template: BoardTemplate;
  elements: BoardElement[];
  createdAt: Date;
  expiresAt: Date;
  isExpired: boolean;
  lastActivityAt: Date;
}

export interface BoardRoomSummary {
  code: string;
  title: string;
  template: BoardTemplate;
  elementCount: number;
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
}

export interface ConnectedBoardUser {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
}

export type BoardSocketClientMessage =
  | { type: 'JOIN'; roomCode: string; userName?: string; userColor?: string }
  | { type: 'CURSOR_MOVE'; x: number; y: number }
  | { type: 'ELEMENTS_UPDATE'; elements: BoardElement[] }
  | { type: 'ELEMENT_CHANGE'; element: BoardElement; action: 'add' | 'update' | 'delete' }
  | { type: 'CLEAR_BOARD' };

export type BoardSocketServerMessage =
  | {
      type: 'ROOM_STATE';
      room: BoardRoomSummary;
      elements: BoardElement[];
      users: ConnectedBoardUser[];
      currentUser: ConnectedBoardUser;
    }
  | { type: 'USER_JOINED'; user: ConnectedBoardUser }
  | { type: 'USER_LEFT'; userId: string }
  | {
      type: 'USER_CURSOR';
      userId: string;
      userName: string;
      userColor: string;
      x: number;
      y: number;
    }
  | { type: 'ELEMENTS_SYNC'; elements: BoardElement[] }
  | {
      type: 'ELEMENT_SYNC';
      element: BoardElement;
      action: 'add' | 'update' | 'delete';
    }
  | { type: 'BOARD_CLEARED' }
  | { type: 'ROOM_EXPIRED' }
  | { type: 'ERROR'; message: string };
