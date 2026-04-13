require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const fs = require('fs/promises');
const models = require('./backend/models');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static frontend files
app.use(express.static(__dirname));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
      console.log('Connected to MongoDB');
      
      // Seed/Sync the definitive admin user as requested 
      try {
          const { users } = models;
          const adminId = 'admin';
          const adminPass = 'admin@123';
          
          let admin = await users.findOne({ role: 'admin' });
          if (admin) {
              admin.username = adminId;
              admin.password = adminPass;
              await admin.save();
              console.log('ADMIN SYNC: Admin account updated to definitively match required credentials.');
          } else {
              await users.create({ username: adminId, password: adminPass, role: 'admin' });
              console.log('ADMIN SYNC: Admin account created from scratch.');
          }
      } catch (e) {
          console.error('ADMIN SYNC FAILED:', e);
      }
      
      
      // Auto-migrate from JSON if DB is empty
      try {
          const invCount = await models.inventory.countDocuments();
          if (invCount === 0) {
              console.log('Database empty, migrating from data.json...');
              const raw = await fs.readFile(path.join(__dirname, 'backend', 'data.json'), 'utf-8');
              const data = JSON.parse(raw);
              if (data.inventory && data.inventory.length) await models.inventory.insertMany(data.inventory);
              if (data.customers && data.customers.length) await models.customers.insertMany(data.customers);
              if (data.invoices && data.invoices.length)  await models.invoices.insertMany(data.invoices);
              if (data.payments && data.payments.length)  await models.payments.insertMany(data.payments);
              console.log('Migration complete!');
          }
      } catch (err) {
          console.error('Migration check failed. You may ignore this if data.json was deleted:', err);
      }
  })
  .catch(err => {
      console.error('Error connecting to MongoDB:', err);
  });

// Global API Routes (supporting get/set of entire arrays to maintain frontend sync logic seamlessly)
app.get('/api/:collection', async (req, res) => {
    const collName = req.params.collection;
    const Model = models[collName];
    if (!Model) return res.status(404).json({ error: 'Collection not found' });
    
    try {
        // Implement a 1-second timeout for database queries
        const fetchPromise = Model.find({}).lean();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database Query Timeout')), 1000)
        );

        const data = await Promise.race([fetchPromise, timeoutPromise]);

        // Remove MongoDB internal _id before sending to frontend
        const sanitized = data.map(item => {
           const { _id, __v, ...rest } = item;
           return rest;
        });
        res.json(sanitized);
    } catch(e) {
        console.warn(`DATABASE FETCH FAILED for ${collName}, falling back to data.json. Reason:`, e.message);
        try {
            const raw = await fs.readFile(path.join(__dirname, 'backend', 'data.json'), 'utf-8');
            const data = JSON.parse(raw);
            const fallback = data[collName] || [];
            res.json(Array.isArray(fallback) ? fallback : []);
        } catch (fileErr) {
            console.error('CRITICAL: Local JSON fallback failed:', fileErr.message);
            res.json([]);
        }
    }
});

app.post('/api/:collection', async (req, res) => {
    const collName = req.params.collection;
    const Model = models[collName];
    if (!Model) return res.status(404).json({ error: 'Collection not found' });
    
    try {
        const newData = req.body || [];
        
        await Model.deleteMany({});
        if (newData.length > 0) {
            await Model.insertMany(newData);
        }
        res.json({ success: true });
    } catch(e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// Export the Express API for Vercel Serverless Functions
module.exports = app;

// Start the server locally
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}
