const { ClobClient } = require("@polymarket/clob-client");
const { ethers } = require("ethers");

const host = "https://clob.polymarket.com";
const POLYGON_CHAIN_ID = 137;

let clobClient = null;
let operatorWallet = null;

function initClobClient() {
  if (clobClient) return clobClient;

  // Uses polygon-rpc if NO custom URL is provided
  const provider = new ethers.providers.JsonRpcProvider(process.env.POLY_RPC_URL || "https://polygon-rpc.com");

  if (process.env.POLYMARKET_OPERATOR_KEY) {
    try {
      operatorWallet = new ethers.Wallet(process.env.POLYMARKET_OPERATOR_KEY, provider);
      clobClient = new ClobClient(
        host,
        POLYGON_CHAIN_ID,
        operatorWallet
      );
      console.log("✅ Polymarket CLOB client initialized with operator wallet.");
    } catch (err) {
      console.error("❌ Failed to init operator wallet:", err.message);
      clobClient = new ClobClient(host, POLYGON_CHAIN_ID); // fallback to read-only
    }
  } else {
    // Read-only client for fetching orderbooks
    clobClient = new ClobClient(host, POLYGON_CHAIN_ID);
    console.warn("⚠️ Polymarket CLOB client initialized in read-only mode. Provide POLYMARKET_OPERATOR_KEY to enable trading.");
  }

  return clobClient;
}

module.exports = {
  get clobClient() {
    return initClobClient();
  },
  get operatorWallet() {
    return operatorWallet;
  }
};
