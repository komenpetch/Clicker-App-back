const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get counter value
app.get('/api/counter', async (req, res) => {
  try {
    let counter = await prisma.counter.findFirst();
    if (!counter) {
      counter = await prisma.counter.create({
        data: { value: 0 }
      });
    }
    res.json({ value: counter.value });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Increment counter
app.post('/api/counter/increment', async (req, res) => {
  try {
    const counter = await prisma.counter.findFirst();
    const updated = await prisma.counter.update({
      where: { id: counter.id },
      data: { value: counter.value + 1 }
    });
    res.json({ value: updated.value });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset counter
app.post('/api/counter/reset', async (req, res) => {
  try {
    const counter = await prisma.counter.findFirst();
    const updated = await prisma.counter.update({
      where: { id: counter.id },
      data: { value: 0 }
    });
    res.json({ value: updated.value });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT}`);
});