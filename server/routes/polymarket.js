const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const polymarket = require('../utils/polymarket');
const db = require('../db');
const fetch = require('node-fetch');

// The markup fee requested: 1.5%
const MARKUP_FEE_PERCENT = 0.015;

// Fetch active markets from Polymarket Gamma API
router.get('/markets', async (req, res) => {
  try {
    // For dating context, we can search for celebrity/social events
    // Here we just fetch active items for demonstration
    const url = 'https://gamma-api.polymarket.com/events?active=true&closed=false&limit=20';
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch from polymarket gamma');
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching polymarket markets:', error.message);
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
});

// Proxy Trade Endpoint
router.post('/proxy-trade', requireAuth, async (req, res) => {
  try {
    const { tokenId, price, size, side } = req.body;
    const userId = req.user.id;

    if (!tokenId || !price || !size || !side) {
      return res.status(400).json({ error: 'Missing required trade parameters' });
    }

    // Must be positive values
    if (price <= 0 || size <= 0) {
      return res.status(400).json({ error: 'Invalid price or size' });
    }

    // Calculate real price using 1.5% fee logic
    let realPrice;
    let feeAmount;

    // "Si el user paga 0.74, el precio real es 0.72. Tú te quedas 0.02"
    if (side === 'BUY') {
      realPrice = price / (1 + MARKUP_FEE_PERCENT); 
      feeAmount = price - realPrice;
    } else if (side === 'SELL') {
      realPrice = price * (1 + MARKUP_FEE_PERCENT);
      feeAmount = realPrice - price;
    } else {
      return res.status(400).json({ error: 'Invalid side, must be BUY or SELL' });
    }

    const { clobClient, operatorWallet } = polymarket;

    if (!operatorWallet) {
      return res.status(503).json({ error: 'Polymarket operator not configured' });
    }

    // Place the order securely using the proxy backend wallet
    const orderParams = {
      tokenID: tokenId,
      price: Number(realPrice.toFixed(3)),
      side: side,
      size: Number(size),
      feeRateBps: 0, // Fee rate configured on CLOB matches
      nonce: 0 // Will be handled internally or incremented based on clob logic
    };

    const order = await clobClient.createOrder(orderParams);
    const orderResponse = await clobClient.postOrder(order);

    if (orderResponse.success !== true && !orderResponse.orderID) {
      throw new Error(orderResponse.errorMsg || 'Failed to post Polymarket order');
    }

    // Log the fee earned for transparency and analytics
    await db.query(`
      CREATE TABLE IF NOT EXISTS earned_fees (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        trade_type VARCHAR(10) NOT NULL,
        trade_size DECIMAL(10, 4) NOT NULL,
        real_price DECIMAL(10, 4) NOT NULL,
        user_price DECIMAL(10, 4) NOT NULL,
        fee_earned DECIMAL(10, 4) NOT NULL,
        hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`
      INSERT INTO earned_fees (user_id, trade_type, trade_size, real_price, user_price, fee_earned, hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      userId, 
      side, 
      size, 
      realPrice, 
      price, 
      (feeAmount * size), 
      orderResponse.orderID
    ]);

    res.json({ 
      success: true, 
      orderId: orderResponse.orderID,
      hash: orderResponse.orderID
    });

  } catch (error) {
    console.error('Polymarket proxy-trade error:', error.message);
    res.status(500).json({ error: error.message || 'Trade execution failed' });
  }
});

module.exports = router;
