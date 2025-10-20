// This module handles all functions related to rendering and updating the user interface.

const mainContent = document.getElementById('main-content');
const backToHomeBtn = document.getElementById('back-to-home');

/** Renders the home page with the list of cases. */
export function renderHomePage(cases, userId, onCaseSelect) {
    backToHomeBtn.classList.add('hidden');
    mainContent.className = 'py-12 px-4';
    document.querySelector('footer').innerHTML = 'Investigate, Connect, Solve.';

    mainContent.innerHTML = `
        <div class="max-w-4xl mx-auto">
            <h1 class="text-4xl font-bold mb-4 text-center text-gray-200">Select Your Mission</h1>
            <p class="text-center text-lg text-gray-400 mb-10">Uncover the web of causes and effects. User ID: ${userId}</p>
            <div id="case-list" class="grid grid-cols-1 md:grid-cols-2 gap-6"></div>
        </div>
    `;

    const caseList = document.getElementById('case-list');
    cases.forEach(caseItem => {
        const card = document.createElement('div');
        card.className = "bg-gray-800 p-6 rounded-xl shadow-xl border-l-4 border-yellow-600 hover:bg-gray-700 transition duration-300 transform hover:scale-[1.02] cursor-pointer";
        card.innerHTML = `
            <h3 class="text-2xl font-bold text-yellow-300 mb-2">${caseItem.title}</h3>
            <p class="text-gray-400 mb-3">${caseItem.description}</p>
            <div class="flex justify-between items-center text-sm">
                <span class="font-semibold text-gray-300">Difficulty: ${caseItem.difficulty}</span>
                <span class="bg-yellow-600 text-gray-900 px-3 py-1 rounded-full font-bold">START CASE</span>
            </div>
        `;
        card.addEventListener('click', () => onCaseSelect(caseItem));
        caseList.appendChild(card);
    });
}

/** Renders the main mind map editor view. */
export function renderMindMapEditor(caseData, mindMapState, interactionHandlers) {
    backToHomeBtn.classList.remove('hidden');
    mainContent.className = '';
    mainContent.innerHTML = `
        <div id="mind-map-editor" class="main-content-grid-robust">
            <div class="flex flex-col bg-gray-800 rounded-xl shadow-2xl p-4 overflow-hidden">
                <h2 class="text-2xl font-bold mb-4 text-yellow-300">Evidence Drawer</h2>
                <p class="text-gray-400 text-sm mb-3 border-b border-gray-700 pb-2">Drag a card onto the canvas.</p>
                <div id="evidence-list" class="flex flex-col space-y-3 custom-scrollbar overflow-y-auto pr-1"></div>
            </div>
            <div id="mind-map-canvas" class="mind-map-canvas-container relative bg-gray-950 border-4 border-dashed border-gray-700 rounded-xl shadow-inner shadow-black/50">
                <p class="absolute top-2 left-2 text-gray-600 text-xs italic">Drag to move. Click two nodes to link.</p>
                <svg id="svg-links" class="absolute inset-0 w-full h-full pointer-events-none z-0"><defs id="svg-defs"></defs></svg>
            </div>
            <div id="ai-chat-panel" class="bg-gray-800 rounded-xl shadow-2xl p-4 overflow-hidden"></div>
        </div>
    `;
    
    // Add event listeners for the canvas
    const canvas = document.getElementById('mind-map-canvas');
    canvas.ondragover = (e) => e.preventDefault();
    canvas.ondrop = interactionHandlers.handleDrop;
    
    // Populate the components
    populateEvidenceDrawer(caseData.evidence);
    populateAIBotChat(caseData, mindMapState);
    drawCanvasElements(mindMapState, interactionHandlers);
    document.querySelector('footer').innerHTML = `Current Case: <span class="text-gray-300">${caseData.headline}</span>`;
}

// --- SUB-COMPONENT RENDERERS ---

function populateEvidenceDrawer(evidence) {
    const list = document.getElementById('evidence-list');
    list.innerHTML = '';
    evidence.forEach(item => {
        const card = document.createElement('div');
        card.className = "bg-gray-900 text-gray-100 p-3 rounded-lg shadow-lg hover:bg-gray-700 transition duration-150 ease-in-out cursor-grab border-l-4 border-yellow-500 font-medium";
        card.textContent = item.text;
        card.setAttribute('draggable', true);
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData("text/plain", item.text);
            e.dataTransfer.effectAllowed = "copy";
        });
        list.appendChild(card);
    });
}

function populateAIBotChat(caseData, mindMapState) {
    const container = document.getElementById('ai-chat-panel');
    const totalCauseNodes = mindMapState.nodes.filter(n => n.type === 'cause').length;
    const linkCount = mindMapState.links.length;
    const canProceed = totalCauseNodes >= 3 && linkCount >= 2;

    container.innerHTML = `
        <div class="h-full flex flex-col justify-between">
            <div class="space-y-4 text-sm custom-scrollbar overflow-y-auto pr-2">
                <h3 class="text-xl font-bold text-red-500 border-b pb-2 border-gray-600">AI Challenger 🤖 | Probe Logic</h3>
                <div class="bg-gray-700 p-3 rounded-lg shadow-inner text-gray-200">
                    <p class="font-bold text-red-300">PROBE:</p>
                    <p>Welcome, Detective. Your mission, ${caseData.title}, is now active.</p>
                </div>
                <input type="text" placeholder="Respond or type a new hypothesis..." class="w-full p-2 bg-gray-600 text-gray-100 rounded border border-gray-500 focus:ring-yellow-500 focus:border-yellow-500"/>
            </div>
            <div class="mt-4 pt-4 border-t border-gray-700">
                <button id="finalize-button" class="w-full px-4 py-3 text-lg font-extrabold rounded-lg transition-all duration-300 shadow-xl 
                    ${canProceed ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-gray-500 text-gray-200 cursor-not-allowed'}"
                    ${!canProceed ? 'disabled' : ''}
                >
                    ${canProceed ? `Finalize Map & Chat →` : `(Need ${Math.max(0, 3 - totalCauseNodes)} Causes, ${Math.max(0, 2 - linkCount)} Links)`}
                </button>
            </div>
        </div>
    `;
}

/** Draws all nodes and links on the canvas. */
export function drawCanvasElements(mindMapState, interactionHandlers, selectedNodeId) {
    const canvasContainer = document.getElementById('mind-map-canvas');
    if (!canvasContainer) return;
    
    // Clear existing nodes
    Array.from(canvasContainer.children).forEach(child => {
        if (child.classList.contains('node-base')) canvasContainer.removeChild(child);
    });

    // Add Nodes
    mindMapState.nodes.forEach(node => {
        canvasContainer.appendChild(createNodeElement(node, selectedNodeId, interactionHandlers));
    });

    // Draw Links
    drawLinks(mindMapState, selectedNodeId);
    
    // Refresh chat panel for button state
    const currentCaseData = { title: document.querySelector('footer span').textContent }; // Hacky way to get case title for re-render
    populateAIBotChat(currentCaseData, mindMapState);
}


function createNodeElement(node, selectedNodeId, { handleDragStart, handleNodeClick }) {
    const isOutcome = node.type === 'outcome';
    const isSelected = selectedNodeId === node.id;
    
    const baseClasses = "node-base rounded-xl px-4 py-3 shadow-xl transition-all duration-150 transform min-w-[180px] text-center font-semibold text-base select-none whitespace-normal";
    const typeClasses = isOutcome ? "bg-red-700 text-white border-4 border-red-500 z-20 shadow-red-500/50 cursor-default" : "bg-gray-800 text-white border-2 border-gray-600 z-10 hover:bg-gray-700 cursor-grab";
    const selectedClasses = isSelected ? "ring-4 ring-offset-2 ring-yellow-500 ring-offset-gray-900" : "";
    
    const nodeElement = document.createElement('div');
    nodeElement.id = node.id;
    nodeElement.className = `${baseClasses} ${typeClasses} ${selectedClasses}`;
    nodeElement.textContent = node.text.length > 50 ? node.text.substring(0, 47) + '...' : node.text;
    nodeElement.style.left = `${node.x}px`;
    nodeElement.style.top = `${node.y}px`;
    
    if (!isOutcome) {
        nodeElement.addEventListener('mousedown', (e) => handleDragStart(e, node.id));
        nodeElement.addEventListener('touchstart', (e) => handleDragStart(e, node.id));
    }
    nodeElement.addEventListener('click', () => handleNodeClick(node.id));

    return nodeElement;
}

function drawLinks(mindMapState, selectedNodeId) {
    const svg = document.getElementById('svg-links');
    const defs = document.getElementById('svg-defs');
    if (!svg || !defs) return;

    svg.innerHTML = '<defs id="svg-defs"></defs>'; // Clear previous links but keep defs
    
    if (!document.getElementById('arrowhead-d1d5db')) {
        defs.innerHTML = `
            <marker id="arrowhead-d1d5db" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse" fill="#d1d5db"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
            <marker id="arrowhead-fcd34d" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse" fill="#fcd34d"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
        `;
    }

    mindMapState.links.forEach(link => {
        const sourceNode = mindMapState.nodes.find(n => n.id === link.source);
        const targetNode = mindMapState.nodes.find(n => n.id === link.target);
        if (!sourceNode || !targetNode) return;
        
        const sourceCenter = getNodeCenter(sourceNode);
        const targetCenter = getNodeCenter(targetNode);
        
        const isSelected = link.source === selectedNodeId || link.target === selectedNodeId;
        const strokeColor = isSelected ? "#fcd34d" : "#d1d5db";
        const markerFill = isSelected ? "fcd34d" : "d1d5db"; 
        
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute('x1', sourceCenter.x);
        line.setAttribute('y1', sourceCenter.y);
        line.setAttribute('x2', targetCenter.x);
        line.setAttribute('y2', targetCenter.y);
        line.setAttribute('stroke', strokeColor);
        line.setAttribute('stroke-width', "3");
        line.setAttribute('marker-end', `url(#arrowhead-${markerFill})`);
        svg.appendChild(line);
    });
}

function getNodeCenter(node) {
    const nodeElement = document.getElementById(node.id);
    if (!nodeElement) return { x: node.x + 90, y: node.y + 20 };
    return { x: node.x + nodeElement.offsetWidth / 2, y: node.y + nodeElement.offsetHeight / 2 };
}