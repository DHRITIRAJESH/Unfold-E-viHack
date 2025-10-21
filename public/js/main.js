// --- Main JavaScript Code for Mind Map Application (Unified with Timeline & Chatbot) ---

import { ALL_CASES } from './data.js';
// UPDATED IMPORT: Added populateAIBotChat, and ensured drawCanvasElements is imported
import { renderHomePage, renderMindMapEditor, drawCanvasElements, populateAIBotChat } from './ui.js'; 
import { initializeFirebase } from './firebase.js';

// --- GLOBAL STATE ---
let mindMap = { nodes: [], links: [] };
let currentCase = null;
let userId = null; 
let unsubscribeMindMap = null; 

// --- CHATBOT STATE ADDED ---
let chatHistory = [{ role: "assistant", content: "Welcome, Detective. Which piece of evidence is the most compelling cause of the outcome? Drag it onto the canvas to begin!" }]; 

// --- INTERACTION STATE ---
let selectedNodeId = null;
let draggingNodeId = null;
let dragOffset = { x: 0, y: 0 };
let isDoubleClickDrag = false; // From timeline version
let clickTimer = null; // From timeline version
let hasDragged = false; // From timeline version

// --- TIMELINE STATE ---
let timelineStartYear = 1985;
let timelineEndYear = 1990;
let timelineHeight = 600;

// --- APPLICATION FLOW ---

function showHomePage() {
    console.log("showHomePage called");
    if (unsubscribeMindMap) {
        unsubscribeMindMap(); 
        unsubscribeMindMap = null;
    }
    currentCase = null;
    console.log("About to call renderHomePage");
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
    // Initialize timeline
    initializeTimeline();
    
    // Calculate horizontal center position for the outcome node at the top
    const canvasContainer = document.getElementById('mind-map-canvas');
    const canvasWidth = canvasContainer ? canvasContainer.offsetWidth : 800;
    
    const nodeWidth = 180;
    const centerX = (canvasWidth - nodeWidth) / 2;
    const topY = 50; 
    
    const initialMap = {
        nodes: [{ id: "outcome", text: caseData.headline, x: centerX, y: topY, isFixed: true, type: "outcome" }],
        links: []
    };

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
    // MODIFIED: Pass chatHistory to the renderer
    renderMindMapEditor(caseData, mindMap, interactionHandlers, chatHistory); 
}

// --- API Calls (from original Chatbot-focused file) ---
async function loadMindMapFromServer(caseId) {
    try {
        const response = await fetch(`/api/mindmaps/${caseId}`);
        if (response.ok) {
            return response.json();
        }
    } catch (error) {
        console.error("Error loading mind map:", error);
    }
    return null; 
}

// CHAT API CALL ADDED
async function sendChatRequest(messages, currentCaseTitle) {
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, currentCaseTitle })
        });
        if (!response.ok) {
            throw new Error('Chat API failed');
        }
        const data = await response.json();
        return data.reply;
    } catch (error) {
        console.error('Error sending chat message:', error);
        return "System error: Failed to get response from Challenger AI.";
    }
}
async function saveMindMapToServer(caseId, mindMapData) {
    try {
        await fetch(`/api/mindmaps/${caseId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mindMapData)
        });
    } catch (err) {
        console.error('Failed to save mind map:', err);
    }
}


// --- INTERACTION HANDLERS ---
const interactionHandlers = {
    handleDragStart,
    handleNodeClick,
    handleDrop,
    handleDeleteNode, // From timeline version
    // CHAT HANDLER ADDED
    handleChatSubmit 
};

// ===================================
// START: Node Dragging Fixes (From Timeline version)
// ===================================

function handleDragStart(e, nodeId) {
    console.log('handleDragStart called for node:', nodeId, 'event type:', e.type);
    const nodeElement = document.getElementById(nodeId);
    const canvasContainer = document.getElementById('mind-map-canvas');
    
    if (!nodeElement || !canvasContainer) {
        console.log('Missing elements:', { nodeElement: !!nodeElement, canvasContainer: !!canvasContainer });
        return;
    }
    
    const node = mindMap.nodes.find(n => n.id === nodeId);
    if (!node) {
        console.log('Node not found:', nodeId);
        return;
    }
    
    // Check if this is an outcome node - don't allow dragging
    if (node.type === 'outcome') {
        console.log('Outcome node, not allowing drag');
        return;
    }
    
    // Set draggingNodeId immediately for double-click events
    draggingNodeId = nodeId;
    console.log('Set draggingNodeId to:', draggingNodeId);
    
    const isTouchEvent = e.type.startsWith('touch');
    const clientX = isTouchEvent ? e.touches[0].clientX : e.clientX;
    const clientY = isTouchEvent ? e.touches[0].clientY : e.clientY;

    // Calculate offset relative to the node's current position
    const nodeX = parseFloat(nodeElement.style.left) || 0;
    const nodeY = parseFloat(nodeElement.style.top) || 0;
    const canvasRect = canvasContainer.getBoundingClientRect();

    dragOffset = { 
        x: clientX - canvasRect.left - nodeX, 
        y: clientY - canvasRect.top - nodeY
    };
    
    console.log('Drag offset calculated:', dragOffset);
    
    // Set dragging class
    nodeElement.classList.add('is-dragging'); 

    // Reset drag state
    hasDragged = false;

    document.addEventListener(isTouchEvent ? 'touchmove' : 'mousemove', handleDrag);
    document.addEventListener(isTouchEvent ? 'touchend' : 'mouseup', handleDragEnd);
}

function handleDrag(e) {
    if (!draggingNodeId) {
        console.log('No draggingNodeId set');
        return;
    }
    
    // Check if this is an outcome node - don't allow dragging
    const draggingNode = mindMap.nodes.find(n => n.id === draggingNodeId);
    if (draggingNode && draggingNode.type === 'outcome') {
        console.log('Outcome node, not allowing drag');
        return;
    }
    
    // Prevent default touch behavior (e.g., scrolling)
    e.preventDefault();
    
    // Set drag flag
    hasDragged = true;
    
    const canvasContainer = document.getElementById('mind-map-canvas');
    if (!canvasContainer) return;

    const isTouchEvent = e.type.startsWith('touch');
    const clientX = isTouchEvent ? e.touches[0].clientX : e.clientX;
    const clientY = isTouchEvent ? e.touches[0].clientY : e.clientY;

    const canvasRect = canvasContainer.getBoundingClientRect();
    
    let newX = clientX - canvasRect.left - dragOffset.x;
    let newY = clientY - canvasRect.top - dragOffset.y;

    const node = mindMap.nodes.find(n => n.id === draggingNodeId);
    if (node) {
        const canvasWidth = canvasContainer.offsetWidth;
        const canvasHeight = canvasContainer.offsetHeight;
        
        const nodeWidth = 180;
        const nodeHeight = 60;
        
        const maxX = Math.max(0, canvasWidth - nodeWidth);
        const maxY = Math.max(0, canvasHeight - nodeHeight);
        
        node.x = Math.max(0, Math.min(maxX, newX));
        node.y = Math.max(0, Math.min(maxY, newY));
        
        const nodeElement = document.getElementById(draggingNodeId);
        if (nodeElement) {
            nodeElement.style.left = `${node.x}px`;
            nodeElement.style.top = `${node.y}px`;
            nodeElement.style.transition = 'none'; 
            
            // MODIFIED: Pass chatHistory to drawCanvasElements
            drawCanvasElements(mindMap, interactionHandlers, selectedNodeId, chatHistory);
        }
    }
}

function handleDragEnd(event) { // Added 'event' argument for findClosestYearLine
    if (!draggingNodeId) return;
    
    // Clear the click timer
    if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
    }
    
    // Find the closest year line to snap to
    const node = mindMap.nodes.find(n => n.id === draggingNodeId);
    if (node && node.type !== 'outcome') {
        const canvasContainer = document.getElementById('mind-map-canvas');
        if (canvasContainer) {
            // Check if 'event' is available, use mouse position from it
            const mouseY = event ? (event.clientY || (event.changedTouches && event.changedTouches[0].clientY)) : node.y + 30 + canvasContainer.getBoundingClientRect().top; 
            
            const closestYear = findClosestYearLine(mouseY);
            
            if (closestYear) {
                console.log('Snapping node to year:', closestYear);
                const timelineY = getTimelinePosition(closestYear);
                const nodeHeight = 60; 
                const halfHeight = nodeHeight / 2;
                
                node.y = timelineY - halfHeight;
                node.year = closestYear;
                
                if (!node.text.includes('(') || !node.text.match(/\(\d{4}\)/)) {
                    node.text = `${node.text} (${closestYear})`;
                } else {
                    node.text = node.text.replace(/\(\d{4}\)/, `(${closestYear})`);
                }
                
                // Reposition the element in the DOM after snap
                const nodeElement = document.getElementById(draggingNodeId);
                if (nodeElement) {
                    nodeElement.style.left = `${node.x}px`;
                    nodeElement.style.top = `${node.y}px`;
                }

                console.log('Node snapped to year:', closestYear, 'at Y:', node.y);
            }
        }
    }
    
    // Remove the event listeners for smooth finish
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchmove', handleDrag);
    document.removeEventListener('touchend', handleDragEnd);
    
    // Remove the dragging class and restore transitions
    const nodeElement = document.getElementById(draggingNodeId);
    if(nodeElement) {
        nodeElement.classList.remove('is-dragging');
        nodeElement.style.transition = ''; // Restore CSS transitions
    }
    
    draggingNodeId = null;

    // Redraw timeline and canvas elements
    updateTimelineHighlighting();
    drawCanvasElements(mindMap, interactionHandlers, selectedNodeId, chatHistory); // MODIFIED: Pass chatHistory
    saveMindMapToServer(currentCase.id, mindMap);
}

// ===================================
// END: Node Dragging Fixes
// ===================================


function handleNodeClick(nodeId) {
    if (draggingNodeId) return;
    
    const node = mindMap.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // Unchanged logic for selecting/linking nodes
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
    
    // MODIFIED: Pass chatHistory to drawCanvasElements
    drawCanvasElements(mindMap, interactionHandlers, selectedNodeId, chatHistory);
}

function handleDrop(e) {
    e.preventDefault();
    const evidenceFact = e.dataTransfer.getData("text/plain");
    
    const canvasContainer = document.getElementById('mind-map-canvas'); 
    
    if (!evidenceFact || !canvasContainer) {
        console.log('Drop failed: evidenceFact =', evidenceFact, 'canvasContainer =', canvasContainer);
        return;
    }

    const suggestedYear = extractYearFromText(evidenceFact);
    const defaultYear = suggestedYear !== Math.floor((timelineStartYear + timelineEndYear) / 2) ? suggestedYear : timelineStartYear;
    
    const userYear = prompt(`Enter the year for "${evidenceFact}":`, defaultYear);
    let year;
    if (userYear && !isNaN(userYear)) {
        year = parseInt(userYear);
    } else {
        year = defaultYear;
    }
    
    const timelineY = getTimelinePosition(year);
    
    const nodeWidth = 180;
    const nodeHeight = 60; 
    const halfHeight = nodeHeight / 2;
    
    let newX = 250; 
    let newY = timelineY - halfHeight;

    const maxX = Math.max(0, canvasContainer.offsetWidth - nodeWidth);
    const maxY = Math.max(0, canvasContainer.offsetHeight - nodeHeight);
    
    newX = Math.max(0, Math.min(maxX, newX));
    newY = Math.max(0, Math.min(maxY, newY));

    let updatedText = evidenceFact.replace(/\s*\(\d{4}\)/, ''); // Remove any existing year
    updatedText = `${updatedText} (${year})`; // Add the user-selected year
    
    mindMap.nodes.push({
        id: `cause-${Date.now()}`,
        text: updatedText,
        x: newX,
        y: newY,
        type: 'cause',
        year: year
    });
    
    drawTimeline();
    updateTimelineHighlighting();
    
    // MODIFIED: Pass chatHistory to drawCanvasElements
    drawCanvasElements(mindMap, interactionHandlers, selectedNodeId, chatHistory);
    
    saveMindMapToServer(currentCase.id, mindMap);
}

function handleDeleteNode(nodeId) {
    const node = mindMap.nodes.find(n => n.id === nodeId);
    if (!node || node.type === 'outcome') return;
    
    mindMap.links = mindMap.links.filter(link => 
        link.source !== nodeId && link.target !== nodeId
    );
    
    mindMap.nodes = mindMap.nodes.filter(n => n.id !== nodeId);
    
    if (selectedNodeId === nodeId) {
        selectedNodeId = null;
    }
    
    // MODIFIED: Pass chatHistory to drawCanvasElements
    drawCanvasElements(mindMap, interactionHandlers, selectedNodeId, chatHistory);
    saveMindMapToServer(currentCase.id, mindMap);
}

// ===================================
// START: Chatbot Handler (From original Chatbot-focused file)
// ===================================

async function handleChatSubmit(message) {
    if (!message) return;
    
    chatHistory.push({ role: "user", content: message });
    // This is needed to immediately show the user's message
    populateAIBotChat(currentCase, mindMap, chatHistory, interactionHandlers);

    // Add loading
    chatHistory.push({ role: "loading", content: "AI Challenger is thinking..." });
    populateAIBotChat(currentCase, mindMap, chatHistory, interactionHandlers);

    // Prepare API messages
    const apiMessages = chatHistory
        .filter(msg => msg.role !== 'loading')
        .map(msg => ({ role: msg.role, content: msg.content }));

    const aiReply = await sendChatRequest(apiMessages, currentCase.title);

    // Remove loading and add AI reply
    chatHistory.pop();
    chatHistory.push({ role: "assistant", content: aiReply });

    // Update chat panel only
    populateAIBotChat(currentCase, mindMap, chatHistory, interactionHandlers);
}

// ===================================
// END: Chatbot Handler
// ===================================


// --- TIMELINE FUNCTIONS (Unchanged from your second file) ---

function initializeTimeline() {
    // ... (Your existing initializeTimeline function)
    const startYearInput = document.getElementById('start-year');
    const endYearInput = document.getElementById('end-year');
    const updateButton = document.getElementById('update-timeline');
    
    if (startYearInput && endYearInput && updateButton) {
        startYearInput.value = timelineStartYear;
        endYearInput.value = timelineEndYear;
        
        updateButton.addEventListener('click', updateTimeline);
        
        updateCanvasHeight();
    } else {
        setTimeout(initializeTimeline, 100);
    }
}

function updateTimeline() {
    const startYearInput = document.getElementById('start-year');
    const endYearInput = document.getElementById('end-year');
    
    if (startYearInput && endYearInput) {
        timelineStartYear = parseInt(startYearInput.value);
        timelineEndYear = parseInt(endYearInput.value);
        
        updateCanvasHeight();
        drawTimeline();
        repositionNodesOnTimeline();
        
        // MODIFIED: Pass chatHistory to drawCanvasElements
        drawCanvasElements(mindMap, interactionHandlers, selectedNodeId, chatHistory);
        saveMindMapToServer(currentCase.id, mindMap);
    } 
}

function drawTimeline() {
    const timelineYears = document.getElementById('timeline-years');
    if (!timelineYears) {
        return;
    }
    
    timelineYears.innerHTML = '';
    
    const canvas = document.getElementById('mind-map-canvas');
    if (!canvas) {
        return;
    }
    
    timelineHeight = canvas.offsetHeight - 200;
    const yearSpacing = 80;
    const timelineStartY = 180;
    
    const usedYears = new Set();
    mindMap.nodes.forEach(node => {
        if (node.type !== 'outcome') {
            const year = extractYearFromText(node.text);
            if (year >= timelineStartYear && year <= timelineEndYear) {
                usedYears.add(year);
            }
        }
    });
    
    for (let year = timelineEndYear; year >= timelineStartYear; year--) {
        const isUsed = usedYears.has(year);
        
        const yearIndex = timelineEndYear - year;
        const yPosition = timelineStartY + (yearIndex * yearSpacing) - 25;
        
        const yearElement = document.createElement('div');
        yearElement.className = `absolute text-xs font-semibold px-2 py-1 rounded cursor-pointer hover:bg-gray-700 ${
            isUsed ? 'text-yellow-300 bg-yellow-800' : 'text-blue-300 bg-gray-800'
        }`;
        yearElement.textContent = year;
        yearElement.setAttribute('data-year', year);
        
        yearElement.style.left = '0px';
        yearElement.style.top = `${yPosition}px`;
        
        yearElement.addEventListener('click', () => editYear(year, yearElement));
        
        timelineYears.appendChild(yearElement);
        
        const yearLine = document.createElement('div');
        yearLine.className = `absolute w-4 h-0.5 ${isUsed ? 'bg-yellow-400' : 'bg-blue-400'}`;
        yearLine.style.left = '16px';
        yearLine.style.top = `${timelineStartY + (yearIndex * yearSpacing)}px`;
        timelineYears.appendChild(yearLine);
    }
}

function updateCanvasHeight() {
    const canvas = document.getElementById('mind-map-canvas');
    if (!canvas) {
        return;
    }
    
    const yearRange = timelineEndYear - timelineStartYear;
    const timelineStartY = 180;
    const yearSpacing = 80;
    const bottomMargin = 100;
    
    const requiredHeight = timelineStartY + (yearRange * yearSpacing) + bottomMargin;
    
    canvas.style.height = `${requiredHeight}px`;
    timelineHeight = requiredHeight;
}

function updateTimelineHighlighting() {
    const yearElements = document.querySelectorAll('[data-year]');
    
    const usedYears = new Set();
    mindMap.nodes.forEach(node => {
        if (node.type !== 'outcome') {
            const year = extractYearFromText(node.text);
            if (year >= timelineStartYear && year <= timelineEndYear) {
                usedYears.add(year);
            }
        }
    });
    
    yearElements.forEach(element => {
        const year = parseInt(element.getAttribute('data-year'));
        const isUsed = usedYears.has(year);
        
        element.className = `absolute text-xs font-semibold px-2 py-1 rounded cursor-pointer hover:bg-gray-700 ${
            isUsed ? 'text-yellow-300 bg-yellow-800' : 'text-blue-300 bg-gray-800'
        }`;
        
        const yearLine = element.nextElementSibling;
        if (yearLine) {
            yearLine.className = `absolute w-4 h-0.5 ${isUsed ? 'bg-yellow-400' : 'bg-blue-400'}`;
        }
    });
}

function editYear(year, element) {
    const newYear = prompt(`Edit year for this position:`, year);
    if (newYear && !isNaN(newYear) && newYear !== year.toString()) {
        const newYearNum = parseInt(newYear);
        
        element.textContent = newYearNum;
        element.setAttribute('data-year', newYearNum);
        
        const yPosition = element.style.top;
        mindMap.nodes.forEach(node => {
            if (node.type !== 'outcome' && Math.abs(node.y - parseInt(yPosition)) < 20) {
                const nodeYear = extractYearFromText(node.text);
                if (nodeYear === year) {
                    node.text = node.text.replace(/\(\d{4}\)/, `(${newYearNum})`);
                }
            }
        });
        
        // MODIFIED: Pass chatHistory to drawCanvasElements
        drawCanvasElements(mindMap, interactionHandlers, selectedNodeId, chatHistory);
    }
}

function extractYearFromText(text) {
    const yearMatch = text.match(/\((\d{4})\)/);
    if (yearMatch) {
        return parseInt(yearMatch[1]);
    }
    
    return Math.floor((timelineStartYear + timelineEndYear) / 2);
}

function getTimelinePosition(year) {
    const timelineStartY = 180;
    const yearSpacing = 80;
    
    const yearIndex = timelineEndYear - year;
    const yPosition = timelineStartY + (yearIndex * yearSpacing);
    return yPosition;
}

function findClosestYearLine(mouseY) {
    const canvas = document.getElementById('mind-map-canvas');
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const relativeY = mouseY - rect.top;
    
    const timelineStartY = 180;
    const yearSpacing = 80;
    
    let closestYear = null;
    let closestDistance = Infinity;
    
    for (let year = timelineEndYear; year >= timelineStartYear; year--) {
        const yearIndex = timelineEndYear - year;
        const yearY = timelineStartY + (yearIndex * yearSpacing);
        const distance = Math.abs(relativeY - yearY);
        
        if (distance < closestDistance) {
            closestDistance = distance;
            closestYear = year;
        }
    }
    
    return closestYear;
}

function repositionNodesOnTimeline() {
    mindMap.nodes.forEach(node => {
        if (node.type !== 'outcome') {
            const year = extractYearFromText(node.text);
            const nodeHeight = 60; 
            const halfHeight = nodeHeight / 2;
            
            node.y = getTimelinePosition(year) - halfHeight;
            node.x = 250;
        }
    });
}

// --- INITIALIZATION ---
function onAuthReady(uid) {
    console.log("onAuthReady called with uid:", uid);
    userId = uid;
    showHomePage();
}

// Start immediately when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded fired");
    document.getElementById('back-to-home').addEventListener('click', showHomePage);
    console.log("About to call initializeFirebase");
    initializeFirebase(onAuthReady);
});