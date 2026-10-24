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
  creatorToken?: string;
  allowParticipantEditing?: boolean;
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
  allowParticipantEditing?: boolean;
  creatorToken?: string;
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
  messages?: BoardChatMessage[];
  kickedUserIds?: string[];
}

export interface BoardChatMessage {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  role: 'admin' | 'participant';
  isOwner?: boolean;
  text: string;
  timestamp: number;
  status?: 'sending' | 'sent' | 'failed';
}

export interface ConnectedBoardUser {
  id: string;
  name: string;
  color: string;
  role: 'admin' | 'participant';
  isOwner?: boolean;
  isPresenter?: boolean;
  handRaised?: boolean;
  cursor?: { x: number; y: number };
}

export type BoardSocketClientMessage =
  | { type: 'JOIN'; roomCode: string; userName?: string; userColor?: string; creatorToken?: string; clientId?: string }
  | { type: 'CURSOR_MOVE'; x: number; y: number }
  | { type: 'ELEMENTS_UPDATE'; elements: BoardElement[] }
  | { type: 'ELEMENT_CHANGE'; element: BoardElement; action: 'add' | 'update' | 'delete' }
  | { type: 'CLEAR_BOARD' }
  | {
      type: 'LIVE_DRAW';
      strokeId: string;
      points: BoardPoint[];
      color: string;
      strokeWidth: number;
      isHighlighter?: boolean;
      isFinished?: boolean;
    }
  | { type: 'VIEWPORT_SYNC'; panX: number; panY: number; zoom: number }
  | { type: 'ACTIVITY_BROADCAST'; action: string; details?: string }
  | { type: 'TOGGLE_PERMISSIONS'; allowParticipantEditing: boolean }
  | { type: 'PROMOTE_USER'; targetUserId: string }
  | { type: 'REVOKE_ADMIN'; targetUserId: string }
  | { type: 'KICK_USER'; targetUserId: string; reason?: string }
  | { type: 'CHAT_MESSAGE'; text: string; messageId?: string }
  | { type: 'RAISE_HAND'; raised: boolean }
  | { type: 'LOWER_HAND'; targetUserId?: string }
  | { type: 'SEND_REACTION'; emoji: string }
  | { type: 'START_PRESENTING' }
  | { type: 'STOP_PRESENTING' }
  | { type: 'CLAIM_HOST'; token: string }
  | { type: 'PING' };

export type BoardSocketServerMessage =
  | {
      type: 'ROOM_STATE';
      room: BoardRoomSummary;
      elements: BoardElement[];
      users: ConnectedBoardUser[];
      currentUser: ConnectedBoardUser;
      isCreator: boolean;
      role: 'admin' | 'participant';
      allowParticipantEditing: boolean;
      presenterUserId?: string | null;
      recentMessages?: BoardChatMessage[];
      messages?: BoardChatMessage[];
    }
  | { type: 'USER_JOINED'; user: ConnectedBoardUser }
  | { type: 'USER_LEFT'; userId: string }
  | { type: 'USER_KICKED'; userId: string; userName: string; reason?: string }
  | { type: 'KICKED'; reason?: string }
  | { type: 'HOST_CLAIMED'; success: boolean; creatorToken?: string }
  | { type: 'CHAT_BROADCAST'; message: BoardChatMessage }
  | { type: 'HAND_STATE'; userId: string; userName: string; handRaised: boolean }
  | { type: 'REACTION_BURST'; id: string; userId: string; userName: string; emoji: string }
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
  | { type: 'ERROR'; message: string }
  | {
      type: 'LIVE_DRAW_CHUNK';
      userId: string;
      userName: string;
      strokeId: string;
      points: BoardPoint[];
      color: string;
      strokeWidth: number;
      isHighlighter?: boolean;
      isFinished?: boolean;
    }
  | {
      type: 'VIEWPORT_UPDATE';
      userId: string;
      panX: number;
      panY: number;
      zoom: number;
    }
  | {
      type: 'ACTIVITY_INDICATOR';
      userId: string;
      userName: string;
      action: string;
      details?: string;
      timestamp: number;
    }
  | {
      type: 'PERMISSIONS_UPDATED';
      allowParticipantEditing: boolean;
    }
  | {
      type: 'ROLE_UPDATED';
      userId: string;
      role: 'admin' | 'participant';
      userName?: string;
    }
  | {
      type: 'PRESENTATION_STATE';
      presenterUserId: string | null;
      presenterName?: string;
    }
  | { type: 'PONG' };
