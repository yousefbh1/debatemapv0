import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid'; // For generating unique ids

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.get('/', (req, res) => {
    res.send('Hello from DebateMap server!');
  });
  

// Simple in-memory store for sessions and nodes (for MVP)
const sessions: Record<string, DebateSession> = {};
const nodes: Record<string, DebateNode[]> = {};

// Our types (adjust as needed)
interface DebateSession {
  id: string;
  creator: string;
  opponent?: string;
  turn: 'creator' | 'opponent';
  createdAt: number;
}

interface DebateNode {
  id: string;
  sessionId: string;
  author: 'creator' | 'opponent';
  x: number;
  y: number;
  text: string;
  shape: 'Rectangle' | 'Circle' | 'Triangle' | 'Square';
  createdAt: number;
  parentNodeId?: string;
  edgeType?: 'Agree' | 'Disagree' | 'Mixed';
}

wss.on('connection', (ws) => {
  console.log('New client connected.');

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleMessage(ws, msg);
    } catch (err) {
      console.error('Invalid JSON message received:', data);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected.');
  });
});

function broadcastToSession(sessionId: string, payload: any) {
  // For each client on wss, send if they belong to this session
  wss.clients.forEach((client: any) => {
    if (client.readyState === 1 && client.sessionId === sessionId) {
      client.send(JSON.stringify(payload));
    }
  });
}

function handleMessage(ws: any, msg: any) {
  // Basic message schema:
  // { type: 'CREATE_SESSION' | 'JOIN_SESSION' | 'ADD_NODE' | 'UPDATE_NODE' | 'END_TURN', payload: {...} }
  switch (msg.type) {
    case 'CREATE_SESSION': {
      const sessionId = uuidv4();
      const newSession: DebateSession = {
        id: sessionId,
        creator: msg.payload.userId,
        turn: 'creator',
        createdAt: Date.now()
      };
      sessions[sessionId] = newSession;
      nodes[sessionId] = []; // empty node array

      // Attach sessionId to this WebSocket
      ws.sessionId = sessionId;

      // Return session info
      ws.send(JSON.stringify({
        type: 'SESSION_CREATED',
        payload: newSession
      }));
      break;
    }
    case 'JOIN_SESSION': {
      const { sessionId, userId } = msg.payload;
      if (!sessions[sessionId]) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: 'Session not found' }));
        return;
      }
      // If there's no opponent, attach them
      if (!sessions[sessionId].opponent) {
        sessions[sessionId].opponent = userId;
      }
      // Attach sessionId to this WebSocket
      ws.sessionId = sessionId;

      // Return the session and existing nodes
      ws.send(JSON.stringify({
        type: 'SESSION_JOINED',
        payload: {
          session: sessions[sessionId],
          nodes: nodes[sessionId]
        }
      }));
      break;
    }
    case 'ADD_NODE': {
      const { sessionId, node } = msg.payload;
      const session = sessions[sessionId];
      if (!session) return;

      // Basic turn check
      if (!canCurrentUserAct(node.author, session)) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: 'Not your turn!' }));
        return;
      }

      const newNode: DebateNode = {
        ...node,
        id: uuidv4(),
        createdAt: Date.now()
      };
      nodes[sessionId].push(newNode);

      // Broadcast node addition to all in session
      broadcastToSession(sessionId, {
        type: 'NODE_ADDED',
        payload: newNode
      });
      break;
    }
    case 'END_TURN': {
      const { sessionId } = msg.payload;
      const session = sessions[sessionId];
      if (!session) return;
      session.turn = session.turn === 'creator' ? 'opponent' : 'creator';

      broadcastToSession(sessionId, {
        type: 'TURN_CHANGED',
        payload: session.turn
      });
      break;
    }
    // Add more actions: UPDATE_NODE, MOVE_NODE, DELETE_NODE, etc.
    default:
      console.log('Unknown message type:', msg.type);
      break;
  }
}

function canCurrentUserAct(author: 'creator' | 'opponent', session: DebateSession) {
  return author === session.turn;
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
