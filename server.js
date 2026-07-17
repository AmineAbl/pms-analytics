require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const seed = require('./seed');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/segments', require('./routes/segments'));
app.use('/api/comparison', require('./routes/comparison'));

app.get('/', (req, res) => {
  res.json({ service: 'Analytics', status: 'running', port: process.env.PORT });
});

app.post('/api/seed', async (req, res) => {
  try {
    await seed();
    res.json({ message: 'Seed terminé avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4006;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Analytics service démarré sur le port ${PORT}`);
  });
};

start();
