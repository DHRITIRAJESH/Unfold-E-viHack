// --- Main JavaScript Code for Mind Map Application (Without Firebase) ---

import { ALL_CASES } from './data.js';
import { renderHomePage, renderMindMapEditor, drawCanvasElements } from './ui.js';
import { initializeFirebase } from './firebase.js'; // Still need this import

// --- GLOBAL STATE ---
let mindMap = { nodes: [], links: [] };
let currentCase = null;
let userId = null; // Optional: for auth, implement your own
let unsubscribeMindMap = null; // Not used here, but kept for structure

// --- INTERACTION STATE ---
let selectedNodeId = null;
let draggingNodeId = null;
let dragOffset = { x: 0, y: 0 };

// --- APPLICATION FLOW ---

function showHomePage() {
    if (unsubscribeMindMap) {
        unsubscribeMindMap(); // Remove Firebase listener if used; here do nothing
        unsubscribeMindMap = null;
    }
    currentCase = null;
    renderHomePage(ALL_CASES, userId, startMindMap);
}

async function startMindMap(caseData) {
    currentCase = caseData;

    document.getElementById('main-content').innerHTML = `
        <div class="text-center py-20">
            <div class="spinner"></div>
            <p class="mt-4 text-gray-400">Loading your progress for ${caseData.title}...</p>
        </div>
    `;

    await loadAndRenderMindMap(caseData);
}

async function loadAndRenderMindMap(caseData) {
    const initialMap = {
        nodes: [{ id: "outcome", text: caseData.headline, x: 450, y: 50, isFixed: true, type: "outcome" }],
        links: []
    };

    // Replace this with your API call to load data
    const data = await loadMindMapFromServer(caseData.id);

    if (data && data.nodes && data.nodes.length > 0) {
        mindMap = {
            nodes: data.nodes,
            links: data.links
        };
    } else {
        mindMap = initialMap;
        await saveMindMapToServer(caseData.id, mindMap);
    }
    renderMindMapEditor(caseData, mindMap, interactionHandlers);
}

// --- Replace the following API Calls with your server implementation ---
async function loadMindMapFromServer(caseId) {
    // Example placeholder, replace with fetch call
    // return fetch(`/api/mindmaps/${caseId}`).then(res => res.json());
    return null; // default return for now
}

async function saveMindMapToServer(caseId, mindMapData) {
    // Example placeholder, replace with fetch POST call
    // return fetch(`/api/mindmaps/${caseId}`, {
    //      method: 'POST',
    //      headers: { 'Content-Type': 'application/json' },
    //      body: JSON.stringify(mindMapData)
    // });
}

// --- INTERACTION HANDLERS ---
const interactionHandlers = {
    handleDragStart,
    handleNodeClick,
    handleDrop
};

// ===================================
// START: Node Dragging Fixes
// ===================================

function handleDragStart(e, nodeId) {
    e.preventDefault();
    const nodeElement = document.getElementById(nodeId);
    const canvasContainer = document.getElementById('mind-map-canvas-container'); // Get the canvas container for correct offset
    
    if (!nodeElement || !canvasContainer) return;
    
    const isTouchEvent = e.type.startsWith('touch');
    const clientX = isTouchEvent ? e.touches[0].clientX : e.clientX;
    const clientY = isTouchEvent ? e.touches[0].clientY : e.clientY;

    // FIX: Calculate offset relative to the node's current position (not the screen rect)
    const nodeX = parseFloat(nodeElement.style.left) || 0;
    const nodeY = parseFloat(nodeElement.style.top) || 0;
    const canvasRect = canvasContainer.getBoundingClientRect();

    dragOffset = { 
        x: clientX - canvasRect.left - nodeX, 
        y: clientY - canvasRect.top - nodeY
    };
    
    // Set a class to signify dragging (optional but helps performance and styling)
    nodeElement.classList.add('is-dragging'); 
    draggingNodeId = nodeId;

    document.addEventListener(isTouchEvent ? 'touchmove' : 'mousemove', handleDrag);
    document.addEventListener(isTouchEvent ? 'touchend' : 'mouseup', handleDragEnd);
}

function handleDrag(e) {
    if (!draggingNodeId) return;
    
    // Prevent default touch behavior (e.g., scrolling)
    e.preventDefault(); 
    
    const canvasContainer = document.getElementById('mind-map-canvas-container');
    if (!canvasContainer) return;

    const isTouchEvent = e.type.startsWith('touch');
    const clientX = isTouchEvent ? e.touches[0].clientX : e.clientX;
    const clientY = isTouchEvent ? e.touches[0].clientY : e.clientY;

    const canvasRect = canvasContainer.getBoundingClientRect();
    
    // Calculate new position using client coords, canvas container position, and initial drag offset
    let newX = clientX - canvasRect.left - dragOffset.x;
    let newY = clientY - canvasRect.top - dragOffset.y;

    const node = mindMap.nodes.find(n => n.id === draggingNodeId);
    if (node) {
        // Enforce bounds (Max 0 for minimum boundary)
        node.x = Math.max(0, newX);
        node.y = Math.max(0, newY);
        
        const nodeElement = document.getElementById(draggingNodeId);
        if (nodeElement) {
            // Apply new position directly to the DOM element
            nodeElement.style.left = `${node.x}px`;
            nodeElement.style.top = `${node.y}px`;
            
            // Redraw links instantly while dragging
            drawCanvasElements(mindMap, interactionHandlers, selectedNodeId);
        }
    }
}

function handleDragEnd() {
    if (!draggingNodeId) return;
    
    // Remove the event listeners for smooth finish
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchmove', handleDrag);
    document.removeEventListener('touchend', handleDragEnd);
    
    // Remove the dragging class
    const nodeElement = document.getElementById(draggingNodeId);
    if(nodeElement) {
        nodeElement.classList.remove('is-dragging');
    }
    
    draggingNodeId = null;

    // Save data to backend
    saveMindMapToServer(currentCase.id, mindMap);
}

// ===================================
// END: Node Dragging Fixes
// ===================================


function handleNodeClick(nodeId) {
    if (draggingNodeId) return;
    if (selectedNodeId === nodeId) {
        selectedNodeId = null;
    } else if (selectedNodeId) {
        const linkExists = mindMap.links.some(l => 
            (l.source === selectedNodeId && l.target === nodeId) ||
            (l.source === nodeId && l.target === selectedNodeId)
        );
        if (!linkExists) {
            mindMap.links.push({ id: `l-${Date.now()}`, source: selectedNodeId, target: nodeId });
            saveMindMapToServer(currentCase.id, mindMap);
        }
        selectedNodeId = null;
    } else {
        selectedNodeId = nodeId;
    }
    drawCanvasElements(mindMap, interactionHandlers, selectedNodeId);
}

function handleDrop(e) {
    e.preventDefault();
    const evidenceFact = e.dataTransfer.getData("text/plain");
    
    // FIX: Get the drop container element, as this is where the nodes are absolutely positioned.
    const canvasContainer = document.getElementById('mind-map-canvas-container'); 
    
    if (!evidenceFact || !canvasContainer) return;

    // Use the bounds of the container to correctly calculate relative position.
    const rect = canvasContainer.getBoundingClientRect();
    
    // Calculate node position (90 and 20 are half the node width/height for centering)
    const newX = e.clientX - rect.left - 90;
    const newY = e.clientY - rect.top - 20;

    mindMap.nodes.push({
        id: `cause-${Date.now()}`,
        text: evidenceFact,
        x: newX,
        y: newY,
        type: 'cause'
    });
    // Crucial: Redraw the map to show the new node immediately
    drawCanvasElements(mindMap, interactionHandlers, selectedNodeId); 
    
    saveMindMapToServer(currentCase.id, mindMap);
}

// --- INITIALIZATION ---
function onAuthReady(uid) {
    userId = uid;
    showHomePage();
}

window.onload = () => {
  document.getElementById('back-to-home').addEventListener('click', showHomePage);
  initializeFirebase(onAuthReady);  // Must call your custom init
};