🧠 Unfold: Mind Map & Assessment Tool
This is a full-stack JavaScript application designed to help users analyze complex scenarios by interactively creating and evaluating causal mind maps against a chronological timeline.

It integrates a client-side editor with a Node.js/Express backend for data persistence and a Gemini AI Challenger for real-time logical critique.

✨ Features
Interactive Editor: Drag-and-drop evidence nodes onto the canvas and connect them to establish causal links.

Timeline Integration: Position evidence along a flexible chronological timeline (1985-1990 in the mock data) for time-based analysis.

AI Challenger Chatbot: Utilizes the Gemini API to provide challenging, critical feedback on the current mind map structure and hypotheses.

Assessment Flow: The "Finalize Map & Chart" button navigates to a dedicated assessment page that provides a Grade, Complexity Metrics, and Suitable Suggestions based on the map's completeness and structure.

Modular Architecture: Clear separation of concerns between UI (ui.js), Core Logic (main.js), and Backend (server.js).

🛠️ Project Structure

File        | Role & Key Functionality
------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------
main.js     | Application Core & Flow. Manages the global state, application lifecycle, and holds the interactionHandlers that link UI actions (like handleFinalizeMap) to the logic.
ui.js       | Frontend Rendering. Contains all DOM manipulation and rendering logic, including the implementation for renderAssessmentPage (results and suggestions display).
server.js   | Node/Express Backend. Provides API endpoints for saving/loading data (in-memory mock) and routing user chat messages to the Gemini AI.
firebase.js | Data Client (Mock). Handles client-side API requests to the local backend (http://localhost:3000) for data persistence.
data.js     | Case Data (Mock). Provides the initial case scenarios and evidence lists.
public/     | Directory where all frontend files must reside to be served correctly by server.js.

🚀 Getting Started
To run this application, you need Node.js (v18+) and npm.

1. Setup and Installation
   Clone or download the repository files.

Move Frontend Files: Place all client-side files (main.js, ui.js, firebase.js, data.js) inside a directory named public/.

Install Dependencies in your project root:

npm init -y
npm install express cors @google/generative-ai

2. Configure API Key
   The server.js file requires your Gemini API Key to enable the AI Challenger bot.

Set the key as an environment variable before running the server:

# On Linux/macOS

export GEMINI_API_KEY="YOUR_API_KEY_HERE"

# On Windows (PowerShell)

$env:GEMINI_API_KEY="YOUR_API_KEY_HERE"

3. Run the Application
   Start the Backend Server:

node server.js
You should see the message: Server running at http://localhost:3000.

Access the App: Open your web browser and navigate to http://localhost:3000.

📝 Usage
Select a Mission: Choose a case from the home page.

Build the Map: Drag evidence items from the left Evidence Drawer onto the canvas.

Chat: Use the AI Challenger panel to submit hypotheses and receive critical feedback.

Finalize: Once you have at least 3 Cause Nodes and 2 Links, the "Finalize Map & Chart" button turns green. Click it to proceed to the assessment phase.

View Assessment: Review the automatic grade, complexity metrics, and suitable suggestions provided by the system.

Lock Submission: Click "Lock Final Submission" to save your map and return to the home page.

🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to open a pull request or file an issue.
