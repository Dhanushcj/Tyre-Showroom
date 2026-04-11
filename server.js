const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs/promises');

const app = express();
const PORT = process.env.PORT || 3000;
const dataFile = path.join(__dirname, 'backend', 'data.json');

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(__dirname));

// Helper functions for reading and writing data
async function readData() {
    try {
        const raw = await fs.readFile(dataFile, 'utf-8');
        return JSON.parse(raw);
    } catch (error) {
        console.error('Error reading data:', error);
        return { inventory: [], customers: [], invoices: [], payments: [] };
    }
}

async function writeData(data) {
    try {
        await fs.writeFile(dataFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error writing data:', error);
    }
}

// Global API Routes (supporting get/set of entire arrays for simple migration)
app.get('/api/:collection', async (req, res) => {
    const collection = req.params.collection;
    const data = await readData();
    res.json(data[collection] || []);
});

app.post('/api/:collection', async (req, res) => {
    const collection = req.params.collection;
    const data = await readData();
    // Assuming the body is the entirely updated array
    data[collection] = req.body;
    await writeData(data);
    res.json({ success: true });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
