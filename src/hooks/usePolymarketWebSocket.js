import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';

/**
 * usePolymarketWebSocket
 * Connects to Polymarket's live order-book WebSocket.
 * Falls back to polling via the provided `fallbackFetch` when WS is disconnected.
 *
 * @param {string|null}  tokenId        - Polymarket token ID (YES or NO side)
 * @param {function}     onMessage      - Called with each parsed WS message
 * @param {function}     [fallbackFetch]- Optional async fn to poll; called every 10 s when WS is down
 * @returns {{ connected: boolean }}
 */
export function usePolymarketWebSocket(tokenId, onMessage, fallbackFetch) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const pollTimer = useRef(null);
  const onMessageRef = useRef(onMessage);
  const fallbackRef = useRef(fallbackFetch);

  // Keep refs current without re-running effects
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { fallbackRef.current = fallbackFetch; }, [fallbackFetch]);

  const startPolling = useCallback(() => {
    if (pollTimer.current) return;
    pollTimer.current = setInterval(async () => {
      if (fallbackRef.current) {
        try { await fallbackRef.current(); } catch (_) {}
      }
    }, 10_000);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!tokenId) return;

    // Clean up previous connection
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      stopPolling();
      // Subscribe to order book for this token
      // Polymarket CLOB WS market channel subscription format
      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'book',
        assets_ids: [tokenId],
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessageRef.current(data);
      } catch (_) {}
    };

    ws.onclose = () => {
      setConnected(false);
      startPolling();
      // Reconnect after 5 s
      reconnectTimer.current = setTimeout(connect, 5_000);
    };

    ws.onerror = () => {
      ws.close(); // triggers onclose → fallback + reconnect
    };
  }, [tokenId, startPolling, stopPolling]);

  useEffect(() => {
    connect();

    return () => {
      // Cleanup
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      stopPolling();
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { connected };
}
