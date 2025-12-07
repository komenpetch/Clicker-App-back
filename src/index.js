const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const grpcClient = require('./grpcClient');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get counter value and info
app.get('/api/counter', async (req, res) => {
  try {
    let counter = await prisma.counter.findFirst();
    if (!counter) {
      counter = await prisma.counter.create({
        data: { value: 0, clicksPerClick: 1, upgrades: '' }
      });
    }
    
    const upgradeList = counter.upgrades ? counter.upgrades.split(',').filter(Boolean) : [];
    
    res.json({
      value: counter.value,
      clicksPerClick: counter.clicksPerClick,
      upgrades: upgradeList
    });
  } catch (error) {
    console.error('Error fetching counter:', error);
    res.status(500).json({ error: error.message });
  }
});

// Increment counter (with plugin calculation)
app.post('/api/counter/increment', async (req, res) => {
  try {
    const counter = await prisma.counter.findFirst();
    if (!counter) {
      return res.status(404).json({ error: 'Counter not found' });
    }
    
    const upgradeList = counter.upgrades ? counter.upgrades.split(',').filter(Boolean) : [];
    
    // Call plugin via gRPC to calculate click value
    const clickResult = await grpcClient.calculateClickValue(
      counter.id,
      counter.value,
      upgradeList
    );
    
    const clickValue = clickResult.click_value;
    
    // Update counter
    const updated = await prisma.counter.update({
      where: { id: counter.id },
      data: {
        value: counter.value + clickValue,
        clicksPerClick: clickValue
      }
    });
    
    res.json({
      value: updated.value,
      clicksPerClick: updated.clicksPerClick,
      message: clickResult.message
    });
  } catch (error) {
    console.error('Error incrementing counter:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get available upgrades
app.get('/api/upgrades', async (req, res) => {
  try {
    const counter = await prisma.counter.findFirst();
    if (!counter) {
      return res.status(404).json({ error: 'Counter not found' });
    }
    
    const upgradeList = counter.upgrades ? counter.upgrades.split(',').filter(Boolean) : [];
    
    // Call plugin via gRPC
    const upgradesResult = await grpcClient.getAvailableUpgrades(
      counter.id,
      counter.value,
      upgradeList
    );
    
    res.json({
      upgrades: upgradesResult.available_upgrades
    });
  } catch (error) {
    console.error('Error fetching upgrades:', error);
    res.status(500).json({ error: error.message });
  }
});

// Purchase upgrade
app.post('/api/upgrades/purchase', async (req, res) => {
  try {
    const { upgradeId } = req.body;
    
    if (!upgradeId) {
      return res.status(400).json({ error: 'upgradeId is required' });
    }
    
    const counter = await prisma.counter.findFirst();
    if (!counter) {
      return res.status(404).json({ error: 'Counter not found' });
    }

    // Check if already purchased
    const ownedUpgrades = counter.upgrades ? counter.upgrades.split(',').filter(Boolean) : [];
    console.log(`[Purchase] User ${counter.id}, Upgrade: ${upgradeId}, Owned: [${ownedUpgrades.join(', ')}], Raw upgrades field: "${counter.upgrades}"`);
    if (ownedUpgrades.includes(upgradeId)) {
      return res.status(400).json({
        success: false,
        message: 'Already purchased this upgrade'
      });
    }

    // Call plugin via gRPC
    const purchaseResult = await grpcClient.purchaseUpgrade(
      counter.id,
      upgradeId,
      counter.value
    );
    
    if (!purchaseResult.success) {
      return res.status(400).json({
        success: false,
        message: purchaseResult.message
      });
    }
    
    // Update database
    const upgradeList = counter.upgrades ? counter.upgrades.split(',').filter(Boolean) : [];
    upgradeList.push(upgradeId);
    
    const updated = await prisma.counter.update({
      where: { id: counter.id },
      data: {
        value: purchaseResult.new_click_total,
        upgrades: upgradeList.join(',')
      }
    });
    
    res.json({
      success: true,
      message: purchaseResult.message,
      newTotal: updated.value,
      upgrade: purchaseResult.purchased_upgrade
    });
  } catch (error) {
    console.error('Error purchasing upgrade:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reset counter
app.post('/api/counter/reset', async (req, res) => {
  try {
    const counter = await prisma.counter.findFirst();
    const updated = await prisma.counter.update({
      where: { id: counter.id },
      data: { value: 0, clicksPerClick: 1, upgrades: '' }
    });
    res.json({ value: updated.value });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get plugin info
app.get('/api/plugin/info', async (req, res) => {
  try {
    const info = await grpcClient.getPluginInfo();
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: 'Plugin not available' });
  }
});

// Auto-click generation
async function processAutoClicks() {
  try {
    const counter = await prisma.counter.findFirst();
    if (!counter) return;

    const upgradeList = counter.upgrades ? counter.upgrades.split(',').filter(Boolean) : [];
    if (upgradeList.length === 0) return;

    // Get available upgrades from plugin to find auto_rate
    const upgradesResult = await grpcClient.getAvailableUpgrades(
      counter.id,
      counter.value,
      upgradeList
    );

    // Calculate total auto clicks per second
    let autoClicksPerSecond = 0;
    upgradesResult.available_upgrades.forEach(upgrade => {
      if (upgrade.is_purchased && upgrade.auto_rate > 0) {
        autoClicksPerSecond += upgrade.auto_rate;
      }
    });

    if (autoClicksPerSecond > 0) {
      await prisma.counter.update({
        where: { id: counter.id },
        data: {
          value: counter.value + autoClicksPerSecond
        }
      });
      console.log(`[Auto-Click] Generated ${autoClicksPerSecond} clicks`);
    }
  } catch (error) {
    console.error('[Auto-Click] Error:', error.message);
  }
}

// Run auto-click generation every second
setInterval(processAutoClicks, 1000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend (Microkernel Core) running on port ${PORT}`);
  console.log(`⏰ Auto-click generation enabled (1 tick/second)`);
});