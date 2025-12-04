const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../proto/plugin.proto');
const PLUGIN_HOST = process.env.PLUGIN_HOST || 'localhost:50051';

// Load proto
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const pluginProto = grpc.loadPackageDefinition(packageDefinition).clicker;

// Create client
const client = new pluginProto.ClickerPlugin(
  PLUGIN_HOST,
  grpc.credentials.createInsecure()
);

// Promisify gRPC calls
function calculateClickValue(userId, currentClicks, activeUpgrades) {
  return new Promise((resolve, reject) => {
    client.CalculateClickValue(
      {
        user_id: userId,
        current_clicks: currentClicks,
        active_upgrades: activeUpgrades
      },
      (err, response) => {
        if (err) reject(err);
        else resolve(response);
      }
    );
  });
}

function getAvailableUpgrades(userId, currentClicks, ownedUpgrades) {
  return new Promise((resolve, reject) => {
    client.GetAvailableUpgrades(
      {
        user_id: userId,
        current_clicks: currentClicks,
        owned_upgrades: ownedUpgrades
      },
      (err, response) => {
        if (err) reject(err);
        else resolve(response);
      }
    );
  });
}

function purchaseUpgrade(userId, upgradeId, currentClicks) {
  return new Promise((resolve, reject) => {
    client.PurchaseUpgrade(
      {
        user_id: userId,
        upgrade_id: upgradeId,
        current_clicks: currentClicks
      },
      (err, response) => {
        if (err) reject(err);
        else resolve(response);
      }
    );
  });
}

function getPluginInfo() {
  return new Promise((resolve, reject) => {
    client.GetPluginInfo({}, (err, response) => {
      if (err) reject(err);
      else resolve(response);
    });
  });
}

module.exports = {
  calculateClickValue,
  getAvailableUpgrades,
  purchaseUpgrade,
  getPluginInfo
};