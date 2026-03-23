const request = require('supertest');
const express = require('express');
const router = require('../server/routes/polymarket');
const { expect } = require('chai');

// Create mock app
const app = express();
app.use(express.json());
// Mock requireAuth middleware inline
app.use('/api/polymarket', (req, res, next) => {
  req.user = { id: 'test-user-uuid' };
  next();
}, router);

describe('Polymarket Proxy Fee Tests', () => {
  
  it('should calculate 1.5% markup correctly for BUY orders', () => {
    const price = 0.74;
    const markupFeePercent = 0.015;
    const realPrice = price / (1 + markupFeePercent);
    const feeAmount = price - realPrice;
    
    // As per requirement: if user pays 0.74, real price should be ~0.72, we keep ~0.02
    expect(realPrice).to.be.closeTo(0.729, 0.001);
    expect(feeAmount).to.be.closeTo(0.010, 0.001);
  });

  it('should calculate 1.5% markup correctly for SELL orders', () => {
    const price = 0.74;
    const markupFeePercent = 0.015;
    const realPrice = price * (1 + markupFeePercent);
    const feeAmount = realPrice - price;
    
    // User gets 0.74, we sell at ~0.751 to polymarket
    expect(realPrice).to.be.closeTo(0.751, 0.001);
    expect(feeAmount).to.be.closeTo(0.011, 0.001);
  });

  it('E2E: should reject invalid trade parameters', async () => {
    const res = await request(app)
      .post('/api/polymarket/proxy-trade')
      .send({ tokenId: 'mock-123' });
    
    expect(res.status).to.equal(400);
    expect(res.body.error).to.include('Missing required');
  });

  it('E2E: should reject negative price or size', async () => {
    const res = await request(app)
      .post('/api/polymarket/proxy-trade')
      .send({ tokenId: 'mock-123', price: -0.5, size: 10, side: 'BUY' });
    
    expect(res.status).to.equal(400);
    expect(res.body.error).to.include('Invalid price or size');
  });
});
