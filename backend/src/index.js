require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected:', process.env.MONGODB_URI))
  .catch((err) => console.error('MongoDB connection error:', err));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'FaceApp backend is running' });
});

// Routes (add karte jayenge)
// app.use('/api/sync', require('./routes/sync'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
