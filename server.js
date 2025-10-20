const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const mindMaps = {}; // Store for mind maps

// API routes
app.get('/api/mindmaps/:caseId', (req, res) => {
  const { caseId } = req.params;
  if (mindMaps[caseId]) {
    res.json(mindMaps[caseId]);
  } else {
    res.status(404).json({ message: 'Mind map not found' });
  }
});

app.post('/api/mindmaps/:caseId', (req, res) => {
  const { caseId } = req.params;
  mindMaps[caseId] = req.body;
  res.json({ message: 'Mind map saved successfully' });
});

// Catch-all to serve the index.html for SPA routing
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});



app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
