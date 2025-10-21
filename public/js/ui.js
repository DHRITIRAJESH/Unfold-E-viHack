// This module handles all functions related to rendering and updating the user interface.

// Make sure to add chatHistory to the module scope for temporary storage/access during re-renders.
// Note: This is now being passed from main.js, but keeping the module scope clear of it.
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
            <h3 class="text-2xl font-bold text-yellow-300 mb-2">${caseItem.title} 
            ${caseItem.difficulty === 'Advanced' ? '<span class="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">🔥 ADVANCED</span>' : ''}
            </h3>
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
export function renderMindMapEditor(caseData, mindMapState, interactionHandlers, chatHistory) {
    backToHomeBtn.classList.remove('hidden');
    mainContent.className = '';
    mainContent.innerHTML = `
        <div id="mind-map-editor" class="main-content-grid-robust">
            <div class="flex flex-col bg-gray-800 rounded-xl shadow-2xl p-4 overflow-hidden">
                <h2 class="text-2xl font-bold mb-4 text-yellow-300">Evidence Drawer</h2>
                <p class="text-gray-400 text-sm mb-3 border-b border-gray-700 pb-2">Drag a card onto the timeline.</p>
                <div class="bg-gray-800 p-3 rounded mb-3 text-xs shadow-lg">
                    <div class="text-yellow-300 text-sm font-semibold mb-2">📋 How to Use Timeline:</div>
                    <div class="text-gray-300 text-xs space-y-1">
                        <div>1️⃣ Set start & end years above</div>
                        <div>2️⃣ Click "Update" to create timeline</div>
                        <div>3️⃣ Drag evidence cards to timeline</div>
                        <div>4️⃣ Double-click nodes to move them</div>
                        <div>5️⃣ Click two nodes to create links</div>
                    </div>
                </div>
                <div id="evidence-list" class="flex flex-col space-y-3 custom-scrollbar overflow-y-auto pr-1"></div>
            </div>
        <div id="mind-map-canvas" class="mind-map-canvas-container relative bg-gray-950 border-4 border-dashed border-gray-700 rounded-xl shadow-inner shadow-black/50">
            <div class="absolute top-2 left-2 text-gray-600 text-xs italic">Timeline View - Drag evidence to timeline</div>
            <div id="timeline-controls" class="absolute top-2 right-2 bg-gray-800 p-2 rounded-lg shadow-lg z-30">
                <div class="flex items-center space-x-2 text-sm">
                    <label class="text-gray-300">Start:</label>
                    <input type="number" id="start-year" value="1985" class="w-16 px-2 py-1 bg-gray-700 text-white rounded border border-gray-600">
                    <label class="text-gray-300">End:</label>
                    <input type="number" id="end-year" value="1990" class="w-16 px-2 py-1 bg-gray-700 text-white rounded border border-gray-600">
                    <button id="update-timeline" class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500">Update</button>
                </div>
            </div>
            <div id="timeline-line" class="absolute left-20 top-0 bottom-0 w-1 bg-blue-500"></div>
            <div id="timeline-years" class="absolute left-16 top-0 bottom-0"></div>
            <svg id="svg-links" class="absolute inset-0 w-full h-full pointer-events-none z-0"><defs id="svg-defs"></defs></svg>
            </div>
            <div id="ai-chat-panel" class="bg-gray-800 rounded-xl shadow-2xl p-4 overflow-hidden"></div>
        </div>
    `;
    
    // Add event listeners for the canvas
    const canvas = document.getElementById('mind-map-canvas');
    canvas.ondragover = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    };
    canvas.ondrop = interactionHandlers.handleDrop;
    
    // Populate the components
    populateEvidenceDrawer(caseData.evidence);
    // 1. Pass chatHistory and Interaction Handlers
    populateAIBotChat(caseData, mindMapState, chatHistory, interactionHandlers);
    drawCanvasElements(mindMapState, interactionHandlers, null, chatHistory);
    document.querySelector('footer').innerHTML = `Current Case: <span class="text-gray-300 font-bold">${caseData.headline}</span>`;
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
            console.log('Drag started with:', item.text);
            // Include both the text and a type hint in the drag data
            e.dataTransfer.setData("text/plain", item.text); 
            e.dataTransfer.setData("application/json", JSON.stringify({ text: item.text, type: 'cause' }));
            e.dataTransfer.effectAllowed = "copy";
        });
        card.addEventListener('dragend', (e) => {
            console.log('Drag ended');
        });
        list.appendChild(card);
    });
}

/** Renders all chat elements and the submit/finalize controls. */
export function populateAIBotChat(caseData, mindMapState, chatHistory, interactionHandlers = {}) {
    const container = document.getElementById('ai-chat-panel');
    if (!container) return; // Exit if not in the map editor view
    
    // Logic for the Finalize button
    const totalCauseNodes = mindMapState.nodes.filter(n => n.type === 'cause').length;
    const linkCount = mindMapState.links.length;
    const canProceed = totalCauseNodes >= 3 && linkCount >= 2;

    container.innerHTML = `
        <div class="h-full flex flex-col justify-between">
            <div class="flex-grow space-y-4 text-sm custom-scrollbar overflow-y-auto pr-2" id="chat-messages-container">
                <h3 class="text-xl font-bold text-red-400 border-b pb-2 border-gray-700 sticky top-0 bg-gray-800 z-10">AI Challenger 🤖 | Probe Logic</h3>
            </div>
            <div class="mt-4 pt-4 border-t border-gray-700 space-y-3">
                <div class="flex space-x-2">
                    <input type="text" id="chat-input" placeholder="Respond or type a new hypothesis..." class="flex-grow p-3 bg-gray-700 text-gray-100 rounded-lg border border-gray-600 focus:ring-yellow-500 focus:border-yellow-500"/>
                    <button id="send-chat-button" class="px-4 py-2 bg-yellow-600 text-gray-900 font-bold rounded-lg hover:bg-yellow-500 transition duration-150">Send</button>
                </div>

                <button id="finalize-button" class="w-full px-4 py-3 text-lg font-extrabold rounded-lg transition-all duration-300 shadow-xl 
                    ${canProceed ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-gray-500 text-gray-200 cursor-not-allowed'}"
                    ${!canProceed ? 'disabled' : ''}
                >
                    ${canProceed ? `Finalize Map & Chat →` : `(Need ${Math.max(0, 3 - totalCauseNodes)} Causes, ${Math.max(0, 2 - linkCount)} Links)`}
                </button>
            </div>
        </div>
    `;

    // Render the actual chat history
    renderChatMessages(chatHistory);

    // Add event listeners for chat submission
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-chat-button');

    if (chatInput && sendButton && interactionHandlers.handleChatSubmit) {
        const submitHandler = () => {
            const message = chatInput.value.trim();
            if (message) {
                interactionHandlers.handleChatSubmit(message);
                chatInput.value = ''; // Clear input field
            }
        };

        sendButton.addEventListener('click', submitHandler);
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                submitHandler();
            }
        });
    }

    // Add event listener for finalize button
    const finalizeButton = document.getElementById('finalize-button');
    if (finalizeButton && interactionHandlers.handleFinalizeMap) {
        finalizeButton.addEventListener('click', interactionHandlers.handleFinalizeMap);
    }
}

function renderChatMessages(history) {
    const chatContainer = document.getElementById('chat-messages-container');
    if (!chatContainer) return;

    // Clear previous messages, but keep the sticky header
    const messagesDiv = document.createElement('div');
    messagesDiv.id = 'messages-content';

    history.forEach(msg => {
        const isUser = msg.role === 'user';
        const isLoading = msg.role === 'loading';
        
        const messageElement = document.createElement('div');
        messageElement.className = `p-3 rounded-lg shadow-md max-w-[85%] ${
            isUser 
                ? 'bg-blue-600 text-white ml-auto' 
                : (isLoading 
                    ? 'bg-gray-600 text-gray-300 animate-pulse flex items-center space-x-2' 
                    : 'bg-gray-700 text-gray-200 mr-auto'
                  )
        }`;
        
        if (isLoading) {
            messageElement.innerHTML = `
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>${msg.content}</span>
            `;
        } else {
            const sender = isUser ? 'You' : 'PROBE';
            messageElement.innerHTML = `<p class="font-bold ${isUser ? 'text-blue-200' : 'text-red-300'}">${sender}:</p><p class="mt-1 whitespace-pre-wrap">${msg.content}</p>`;
        }

        messagesDiv.appendChild(messageElement);
    });

    // Replace the old messages content, preserving the header
    const oldMessagesContent = document.getElementById('messages-content');
    if (oldMessagesContent) {
        chatContainer.removeChild(oldMessagesContent);
    }
    chatContainer.appendChild(messagesDiv);
    
    // Auto-scroll to the latest message
    chatContainer.scrollTop = chatContainer.scrollHeight;
}


/** Draws all nodes and links on the canvas. */
export function drawCanvasElements(mindMapState, interactionHandlers, selectedNodeId) {
    const canvasContainer = document.getElementById('mind-map-canvas');
    if (!canvasContainer) return;
    
    // Clear existing nodes and delete buttons
    Array.from(canvasContainer.children).forEach(child => {
        if (child.classList.contains('node-base') || (child.tagName === 'BUTTON' && child.textContent === '×')) {
            canvasContainer.removeChild(child);
        }
    });

    // Add Nodes
    mindMapState.nodes.forEach(node => {
        canvasContainer.appendChild(createNodeElement(node, selectedNodeId, interactionHandlers));
    });

    // Draw Links
    drawLinks(mindMapState, selectedNodeId);
}


function createNodeElement(node, selectedNodeId, { handleDragStart, handleNodeClick, handleDeleteNode }) {
    const isOutcome = node.type === 'outcome';
    const isSelected = selectedNodeId === node.id;
    
    // Set a max width and use flex-col for the content inside for better wrapping
    const baseClasses = "node-base rounded-xl px-4 py-3 shadow-xl transition-all duration-150 transform min-w-[180px] max-w-[200px] text-center font-semibold text-base select-none whitespace-normal";
    const typeClasses = isOutcome ? "bg-red-700 text-white border-4 border-red-500 z-20 shadow-red-500/50 cursor-default" : "bg-gray-800 text-white border-2 border-gray-600 z-10 hover:bg-gray-700 cursor-grab";
    const selectedClasses = isSelected ? "ring-4 ring-offset-2 ring-yellow-500 ring-offset-gray-900" : "";
    
    const nodeElement = document.createElement('div');
    nodeElement.id = node.id;
    nodeElement.className = `${baseClasses} ${typeClasses} ${selectedClasses}`;
    
    // Display text and year if available
    const nodeText = document.createElement('div');
    nodeText.className = 'text-center';
    nodeText.textContent = node.text.length > 50 ? node.text.substring(0, 47) + '...' : node.text;

    const nodeYear = document.createElement('div');
    nodeYear.className = 'text-xs font-normal text-gray-400 mt-1';
    if (node.year) {
        nodeYear.textContent = `Year: ${node.year}`;
    }
    
    nodeElement.appendChild(nodeText);
    nodeElement.appendChild(nodeYear);
    
    // Add delete button for selected non-outcome nodes
    if (isSelected && !isOutcome) {
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '×';
        deleteBtn.className = 'absolute bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shadow-lg transition-colors duration-150';
        deleteBtn.title = 'Delete node';
        // Position at top-right corner of the node, accounting for max-width
        deleteBtn.style.left = `${node.x + 200 - 8}px`; 
        deleteBtn.style.top = `${node.y - 8}px`;
        deleteBtn.style.zIndex = '30';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Use a custom non-alert confirmation (for now, just log and proceed)
            console.warn('Node delete requested. Implement custom confirmation modal.');
            handleDeleteNode(node.id); // For now, delete directly
        });
        
        // Add delete button to canvas container instead of node
        const canvasContainer = document.getElementById('mind-map-canvas');
        canvasContainer.appendChild(deleteBtn);
        
        // Store reference to delete button for cleanup (optional, handled by clearing all buttons)
        nodeElement.deleteButton = deleteBtn;
    }
    
    nodeElement.style.left = `${node.x}px`;
    nodeElement.style.top = `${node.y}px`;
    
    // Add event listeners for click (linking) and double-click (dragging)
    nodeElement.addEventListener('click', (e) => {
        console.log('Click event fired on node:', node.id);
        e.stopPropagation();
        handleNodeClick(node.id);
    });
    
    nodeElement.addEventListener('dblclick', (e) => {
        console.log('Double click on node:', node.id);
        e.preventDefault();
        e.stopPropagation();
        // Start dragging immediately on double-click
        handleDragStart(e, node.id);
    });
    
    // Touch event listener for drag/click handling on mobile
    let touchTimeout = null;
    let isDragging = false;
    
    nodeElement.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        
        // Set a short timer to treat it as a click if no movement (tap)
        touchTimeout = setTimeout(() => {
            // Long press or slight movement starts drag
            isDragging = true;
            handleDragStart(e, node.id);
        }, 300); // 300ms for long press/drag start
        
        // Prevent default behavior to avoid scrolling, but only if we are starting a drag
        if (!isOutcome) {
            e.preventDefault();
        }
    }, { passive: false });
    
    nodeElement.addEventListener('touchmove', (e) => {
        // Clear the timeout if we move, confirming drag intent
        clearTimeout(touchTimeout);
        if (isDragging) {
            // The handleDragStart initiated the move listeners, so nothing to do here
        }
    }, { passive: false });

    nodeElement.addEventListener('touchend', (e) => {
        clearTimeout(touchTimeout);
        if (!isDragging) {
            // It was a short tap, treat as a click
            handleNodeClick(node.id);
        }
        isDragging = false; // Reset drag state
    });

    return nodeElement;
}

function drawLinks(mindMapState, selectedNodeId) {
    const svg = document.getElementById('svg-links');
    const defs = document.getElementById('svg-defs');
    if (!svg || !defs) return;

    svg.innerHTML = '<defs id="svg-defs"></defs>'; // Clear previous links but keep defs
    
    // Ensure the markers are defined
    if (!document.getElementById('arrowhead-d1d5db')) {
        defs.innerHTML = `
            <marker id="arrowhead-d1d5db" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse" fill="#d1d5db"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
            <marker id="arrowhead-fcd34d" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse" fill="#fcd34d"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
        `;
    }

    // Draw Links between nodes
    mindMapState.links.forEach(link => {
        const sourceNode = mindMapState.nodes.find(n => n.id === link.source);
        const targetNode = mindMapState.nodes.find(n => n.id === link.target);
        if (!sourceNode || !targetNode) return;
        
        const sourceCenter = getNodeCenter(sourceNode);
        const targetCenter = getNodeCenter(targetNode);
        
        const isSelected = link.source === selectedNodeId || link.target === selectedNodeId;
        const strokeColor = isSelected ? "#fcd34d" : "#d1d5db";
        const markerFill = isSelected ? "fcd34d" : "d1d5db"; // Use for marker id reference
        
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
    
    // Draw timeline and dotted lines
    const startYearInput = document.getElementById('start-year');
    const endYearInput = document.getElementById('end-year');
    const timelineLine = document.getElementById('timeline-line');
    const timelineYearsContainer = document.getElementById('timeline-years');

    if (!startYearInput || !endYearInput || !timelineLine || !timelineYearsContainer) return;
    
    const timelineStartYear = parseInt(startYearInput.value);
    const timelineEndYear = parseInt(endYearInput.value);
    const timelineRange = timelineEndYear - timelineStartYear;

    if (isNaN(timelineStartYear) || isNaN(timelineEndYear) || timelineRange < 1) return;

    // Reset years container and calculate total height needed
    timelineYearsContainer.innerHTML = '';
    
    // Arbitrary starting margin and spacing to make it visible
    const TOP_OFFSET = 100;
    const CANVAS_HEIGHT = document.getElementById('mind-map-canvas').offsetHeight;
    const PIXEL_PER_YEAR = (CANVAS_HEIGHT - TOP_OFFSET * 2) / (timelineRange + 1);

    // Timeline line position is fixed at 80px from left
    const TIMELINE_X = 80;

    // Redraw Year Markers (from endYear down to startYear)
    for (let year = timelineEndYear; year >= timelineStartYear; year--) {
        const yearIndex = timelineEndYear - year;
        const yPos = TOP_OFFSET + yearIndex * PIXEL_PER_YEAR;

        // 1. Year Label
        const yearLabel = document.createElement('div');
        yearLabel.className = 'absolute text-lg font-mono font-bold text-blue-300 transform -translate-x-full pr-4';
        yearLabel.style.top = `${yPos - 12}px`; // Centered vertically
        yearLabel.textContent = year;
        timelineYearsContainer.appendChild(yearLabel);

        // 2. Year Ridge/Mark on the blue line
        const yearRidge = document.createElement('div');
        yearRidge.className = 'absolute w-6 h-1 bg-blue-500 rounded-full transform -translate-x-1/2';
        yearRidge.style.left = `${TIMELINE_X}px`;
        yearRidge.style.top = `${yPos}px`;
        timelineYearsContainer.appendChild(yearRidge);
    }
    
    // Draw dotted lines from timeline to nodes
    mindMapState.nodes.forEach(node => {
        if (node.type !== 'outcome' && node.year) {
            
            // Check if node's year is within the set range
            if (node.year < timelineStartYear || node.year > timelineEndYear) return;

            // Calculate Y position based on the node's year
            const yearIndex = timelineEndYear - node.year;
            const timelineY = TOP_OFFSET + yearIndex * PIXEL_PER_YEAR;
            
            // Draw dotted line from timeline ridge to node center's Y position
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute('x1', TIMELINE_X); // Timeline line position
            line.setAttribute('y1', timelineY);
            line.setAttribute('x2', node.x); // Node left edge
            line.setAttribute('y2', timelineY); // Connect to the same Y as the timeline ridge
            line.setAttribute('stroke', '#94a3b8'); // Gray color
            line.setAttribute('stroke-width', '2');
            line.setAttribute('stroke-dasharray', '5,5'); // Dotted line
            line.setAttribute('data-node-id', node.id); 
            
            svg.appendChild(line);
            
            // Adjust the node's visual Y position to snap to the timeline
            const nodeElement = document.getElementById(node.id);
            if (nodeElement) {
                // We use timelineY as the center of the node, so we need to adjust
                const nodeHeight = nodeElement.offsetHeight; 
                nodeElement.style.top = `${timelineY - (nodeHeight / 2)}px`;
            }

        }
    });

    // Fix the height of the main blue line to match the drawn markers
    const finalYPos = TOP_OFFSET + timelineRange * PIXEL_PER_YEAR;
    timelineLine.style.height = `${finalYPos - TOP_OFFSET}px`;
    timelineLine.style.top = `${TOP_OFFSET}px`;
    timelineLine.style.left = `${TIMELINE_X}px`;
}

function getNodeCenter(node) {
    const nodeElement = document.getElementById(node.id);
    if (!nodeElement) return { x: node.x + 100, y: node.y + 20 }; // Fallback for estimated size
    return { x: node.x + nodeElement.offsetWidth / 2, y: node.y + nodeElement.offsetHeight / 2 };
}
