require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const auth = require('./middleware/auth');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/dashboard', auth, require('./routes/dashboard'));
app.use('/api/segments', auth, require('./routes/segments'));
app.use('/api/comparison', auth, require('./routes/comparison'));

app.get('/api/health', (req, res) => {
  res.json({ service: 'Analytics', status: 'running', port: process.env.PORT });
});

app.get('/', (req, res) => {
  res.json({ service: 'Analytics', status: 'running', port: process.env.PORT });
});

app.post('/api/seed', auth, async (req, res) => {
  try {
    const seed = require('./seed');
    await seed();
    res.json({ message: 'Seed terminé avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4006;

const start = async () => {
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query('SELECT 1');
    await pool.end();
    console.log('PostgreSQL connecté - Analytics');

    app.listen(PORT, () => {
      console.log(`Analytics service démarré sur le port ${PORT}`);
    });
  } catch (err) {
    console.error('Erreur de connexion PostgreSQL:', err.message);
    process.exit(1);
  }
};

start();
