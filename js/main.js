// This is the main entry point for the application's frontend logic.
// It manages state, handles user interactions, and coordinates other modules.

import { ALL_CASES } from '../data.js';
import { initializeFirebase, listenToMindMap, saveMindMap } from '../firebase.js';
import { renderHomePage, renderMindMapEditor, drawCanvasElements } from './ui.js';

// --- GLOBAL STATE ---
let mindMap = { nodes: [], links: [] };
let currentCase = null;
let userId = null;
let unsubscribeMindMap = null;

// --- INTERACTION STATE ---
let selectedNodeId = null;
let draggingNodeId = null;
let dragOffset = { x: 0, y: 0 };


// --- APPLICATION FLOW ---

function showHomePage() {
    if (unsubscribeMindMap) {
        unsubscribeMindMap();
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

    loadAndRenderMindMap(caseData);
}

function loadAndRenderMindMap(caseData) {
  const initialMap = {
    nodes: [{ id: "outcome", text: caseData.headline, x: 450, y: 50, isFixed: true, type: "outcome" }],
    links: []
  };

  if (unsubscribeMindMap) {
    unsubscribeMindMap();
  }

  unsubscribeMindMap = listenToMindMap(caseData.id, (docSnap) => {
    if (docSnap.exists && docSnap.data().nodes.length > 0) {
      const data = docSnap.data();
      mindMap = {
        nodes: data.nodes || initialMap.nodes,
        links: data.links || initialMap.links
      };
    } else {
      mindMap = initialMap;
      saveMindMap(currentCase.id, mindMap);
    }
    renderMindMapEditor(caseData, mindMap, interactionHandlers);
  });
}


// --- INTERACTION HANDLERS ---
// We group these handlers to pass them to the UI module.
const interactionHandlers = {
    handleDragStart,
    handleNodeClick,
    handleDrop
};

function handleDragStart(e, nodeId) {
    e.preventDefault();
    const nodeElement = document.getElementById(nodeId);
    const isTouchEvent = e.type.startsWith('touch');
    const clientX = isTouchEvent ? e.touches[0].clientX : e.clientX;
    const clientY = isTouchEvent ? e.touches[0].clientY : e.clientY;

    if (nodeElement) {
        const rect = nodeElement.getBoundingClientRect();
        dragOffset = { x: clientX - rect.left, y: clientY - rect.top };
    }
    draggingNodeId = nodeId;

    document.addEventListener(isTouchEvent ? 'touchmove' : 'mousemove', handleDrag);
    document.addEventListener(isTouchEvent ? 'touchend' : 'mouseup', handleDragEnd);
}

function handleDrag(e) {
    if (!draggingNodeId) return;
    
    const canvas = document.getElementById('mind-map-canvas');
    if (!canvas) return;
    
    const isTouchEvent = e.type.startsWith('touch');
    const clientX = isTouchEvent ? e.touches[0].clientX : e.clientX;
    const clientY = isTouchEvent ? e.touches[0].clientY : e.clientY;

    const canvasRect = canvas.getBoundingClientRect();
    let newX = clientX - canvasRect.left - dragOffset.x;
    let newY = clientY - canvasRect.top - dragOffset.y;

    const node = mindMap.nodes.find(n => n.id === draggingNodeId);
    if (node) {
        node.x = Math.max(0, newX);
        node.y = Math.max(0, newY);
        
        const nodeElement = document.getElementById(draggingNodeId);
        if (nodeElement) {
            nodeElement.style.left = `${node.x}px`;
            nodeElement.style.top = `${node.y}px`;
            drawCanvasElements(mindMap, interactionHandlers, selectedNodeId);
        }
    }
}

function handleDragEnd() {
    if (!draggingNodeId) return;

    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchmove', handleDrag);
    document.removeEventListener('touchend', handleDragEnd);
    
    draggingNodeId = null;
    saveMindMap(currentCase.id, mindMap);
}

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
            saveMindMap(currentCase.id, mindMap);
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
    const canvas = document.getElementById('mind-map-canvas');
    if (!evidenceFact || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const newX = e.clientX - rect.left - 90; // Approx half node width
    const newY = e.clientY - rect.top - 20;  // Approx half node height

    mindMap.nodes.push({
        id: `cause-${Date.now()}`,
        text: evidenceFact,
        x: newX,
        y: newY,
        type: 'cause',
    });
    saveMindMap(currentCase.id, mindMap);
}

// --- INITIALIZATION ---
function onAuthReady(uid) {
    userId = uid;
    showHomePage();
}

window.onload = () => {
    document.getElementById('back-to-home').addEventListener('click', showHomePage);
    initializeFirebase(onAuthReady);
};