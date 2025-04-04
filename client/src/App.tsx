import React, { useState, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  addEdge,
  Connection,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';

// A custom node component that styles itself based on the debate node type
const CustomNode = ({ data }: { data: { label: string; nodeType: string } }) => {
  // Base style for the node
  let style: React.CSSProperties = {
    padding: '10px',
    border: '1px solid #777',
    minWidth: '100px',
    textAlign: 'center',
  };

  // Adjust styling based on node type
  switch (data.nodeType) {
    case 'Key Claim':
      style = { ...style, backgroundColor: '#e3f2fd' }; // light blue
      break;
    case 'Supporting Argument':
      style = { ...style, borderRadius: '50%', backgroundColor: '#c8e6c9' }; // green circle
      break;
    case 'Evidence':
      style = {
        ...style,
        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
        backgroundColor: '#fff9c4', // yellow-ish triangle
      };
      break;
    case 'Counterargument':
      style = { ...style, backgroundColor: '#ffcdd2' }; // light red/salmon
      break;
    default:
      break;
  }

  return (
    <div style={style}>
      {/* Target handle (incoming edges) on the left */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#555' }}
      />
      {data.label}
      {/* Source handle (outgoing edges) on the right */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#555' }}
      />
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

const App: React.FC = () => {
  // React Flow state hooks for nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);

  // Local state for our debate functionality
  const [nodeText, setNodeText] = useState('');
  const [nodeType, setNodeType] = useState('Key Claim');
  const [isMyTurn, setIsMyTurn] = useState(true); // Simulate turn-based editing

  // Add a new node
  const addNode = () => {
    if (!isMyTurn) {
      alert("It's not your turn!");
      return;
    }
    const id = (nodes.length + 1).toString();
    const newNode: Node = {
      id,
      type: 'custom', // use our custom node renderer
      data: { label: nodeText || `Node ${id}`, nodeType },
      position: { x: 0, y: 0 },
    };
    setNodes((nds) => [...nds, newNode]);
    setNodeText(''); // Clear input after adding
  };

  // Toggle turn simulation (in a real app, the backend would enforce this)
  const endTurn = () => {
    setIsMyTurn((prev) => !prev);
  };

  // Allow users to create edges by dragging from one node to another
  const onConnect = useCallback(
    (connection: Connection | Edge) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      {/* Control panel */}
      <div
        style={{
          position: 'absolute',
          zIndex: 10,
          top: 10,
          left: 10,
          background: '#fff',
          padding: '10px',
          borderRadius: '5px',
        }}
      >
        <div>
          <strong>Turn:</strong> {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
        </div>
        <div style={{ marginTop: '10px' }}>
          <input
            type="text"
            placeholder="Enter node text"
            value={nodeText}
            onChange={(e) => setNodeText(e.target.value)}
            style={{ marginRight: '5px' }}
          />
          <select
            value={nodeType}
            onChange={(e) => setNodeType(e.target.value)}
          >
            <option value="Key Claim">Key Claim</option>
            <option value="Supporting Argument">Supporting Argument</option>
            <option value="Evidence">Evidence</option>
            <option value="Counterargument">Counterargument</option>
          </select>
        </div>
        <div style={{ marginTop: '10px' }}>
          <button onClick={addNode} disabled={!isMyTurn}>
            Add Node
          </button>
          <button onClick={endTurn} style={{ marginLeft: '5px' }}>
            End Turn
          </button>
        </div>
      </div>

      {/* React Flow canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#aaa" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default App;
