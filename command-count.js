const express = require('express');
const fs = require('fs');
const app = express();
const port = 3000;

app.get('/command-count', (req, res) => {
  try {
    const data = fs.readFileSync('commandCount.json');
    const commandCount = JSON.parse(data).count;
    res.json({ count: commandCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read command count' });
  }
});

app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`);
});