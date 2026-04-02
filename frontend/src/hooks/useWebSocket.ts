'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ============================================================
// TYPES
// ============================================================

interface WSMessage {
  type: string;
  [key: string]: any;
}

interface AgentActivity {
  type: 'agent_activity';
  agent: string;
  emoji: string;
  activity: string;
  activity_type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  symbol?: string;
  timestamp: string;
}

interface AgentStatus {
  type: 'agent_status';
  agent: string;
  role: string;
  emoji: string;
  status: 'active' | 'idle' | 'busy';
  timestamp: string;
}

interface MarketTick {
  type: 'tick';
  symbol: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  timestamp: string;
}

interface RegimeChange {
  type: 'regime_change';
  regime: string;
  confidence: number;
  message: string;
  priority: 'critical';
  timestamp: string;
}

type WSHandler = (message: WSMessage) => void;

// ============================================================
// WEBSOCKET HOOK
// ============================================================

export function useWebSocket(url: string, options: {
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
} = {}) {
  const {
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const ws = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const handlers = useRef<Map<string, Set<WSHandler>>>(new Map());
  
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const wsUrl = token ? `${url}?token=${token}` : url;

    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectCount.current = 0;
        onConnect?.();
        console.log(`[WS] Connected to ${url}`);
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        onDisconnect?.();
        console.log(`[WS] Disconnected from ${url}`);

        // Auto-reconnect with exponential backoff
        if (reconnectCount.current < reconnectAttempts) {
          const delay = reconnectInterval * Math.pow(1.5, reconnectCount.current);
          reconnectCount.current++;
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectCount.current}/${reconnectAttempts})`);
          setTimeout(connect, delay);
        }
      };

      ws.current.onerror = (e) => {
        setError('WebSocket connection error');
        onError?.(e);
        console.error('[WS] Error:', e);
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WSMessage;
          setLastMessage(message);

          // Dispatch to registered handlers
          const typeHandlers = handlers.current.get(message.type);
          if (typeHandlers) {
            typeHandlers.forEach(handler => handler(message));
          }

          // Also dispatch to wildcard handlers
          const wildcardHandlers = handlers.current.get('*');
          if (wildcardHandlers) {
            wildcardHandlers.forEach(handler => handler(message));
          }
        } catch (e) {
          console.error('[WS] Failed to parse message:', e);
        }
      };
    } catch (e) {
      setError('Failed to create WebSocket connection');
      console.error('[WS] Connection error:', e);
    }
  }, [url, reconnectAttempts, reconnectInterval, onConnect, onDisconnect, onError]);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  }, []);

  const send = useCallback((message: object) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('[WS] Cannot send: not connected');
    }
  }, []);

  const subscribe = useCallback((handler: WSHandler, messageType: string = '*') => {
    if (!handlers.current.has(messageType)) {
      handlers.current.set(messageType, new Set());
    }
    handlers.current.get(messageType)!.add(handler);

    return () => {
      handlers.current.get(messageType)?.delete(handler);
    };
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => disconnect();
  }, [autoConnect, connect, disconnect]);

  // Heartbeat
  useEffect(() => {
    if (!isConnected) return;
    
    const interval = setInterval(() => {
      send({ type: 'ping' });
    }, 30000);

    return () => clearInterval(interval);
  }, [isConnected, send]);

  return {
    isConnected,
    lastMessage,
    error,
    connect,
    disconnect,
    send,
    subscribe,
  };
}

// ============================================================
// AGENT FEED HOOK
// ============================================================

export function useAgentFeed(wsUrl?: string) {
  const url = wsUrl || (typeof window !== 'undefined'
    ? `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/v1/ws'}/agents`
    : 'ws://localhost:8000/api/v1/ws/agents');

  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<Map<string, AgentStatus>>(new Map());
  const [regimeChanges, setRegimeChanges] = useState<RegimeChange[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const { isConnected, lastMessage, send, subscribe, ...rest } = useWebSocket(url, {
    onConnect: () => console.log('[AgentFeed] Connected'),
    onDisconnect: () => console.log('[AgentFeed] Disconnected'),
  });

  // Process incoming messages
  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case 'agent_activity':
        const activity = lastMessage as AgentActivity;
        setActivities(prev => [activity, ...prev].slice(0, 100)); // Keep last 100
        if (activity.priority === 'high' || activity.priority === 'critical') {
          setUnreadCount(prev => prev + 1);
        }
        break;

      case 'agent_status':
        const status = lastMessage as AgentStatus;
        setAgentStatuses(prev => {
          const next = new Map(prev);
          next.set(status.agent, status);
          return next;
        });
        break;

      case 'regime_change':
        const regime = lastMessage as RegimeChange;
        setRegimeChanges(prev => [regime, ...prev].slice(0, 10));
        setUnreadCount(prev => prev + 1);
        break;
    }
  }, [lastMessage]);

  const clearUnread = useCallback(() => setUnreadCount(0), []);

  const clearActivities = useCallback(() => setActivities([]), []);

  const filterByAgent = useCallback((agentName: string) => {
    return activities.filter(a => a.agent === agentName);
  }, [activities]);

  const filterByPriority = useCallback((priority: string) => {
    return activities.filter(a => a.priority === priority);
  }, [activities]);

  return {
    isConnected,
    activities,
    agentStatuses: Array.from(agentStatuses.values()),
    regimeChanges,
    unreadCount,
    clearUnread,
    clearActivities,
    filterByAgent,
    filterByPriority,
    send,
    ...rest,
  };
}

// ============================================================
// MARKET FEED HOOK
// ============================================================

export function useMarketFeed(wsUrl?: string) {
  const url = wsUrl || (typeof window !== 'undefined'
    ? `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/v1/ws'}/live`
    : 'ws://localhost:8000/api/v1/ws/live');

  const [ticks, setTicks] = useState<Map<string, MarketTick>>(new Map());
  const [tickHistory, setTickHistory] = useState<MarketTick[]>([]);

  const { isConnected, lastMessage, send, ...rest } = useWebSocket(url, {
    onConnect: () => console.log('[MarketFeed] Connected'),
    onDisconnect: () => console.log('[MarketFeed] Disconnected'),
  });

  useEffect(() => {
    if (!lastMessage || lastMessage.type !== 'tick') return;

    const tick = lastMessage as MarketTick;
    setTicks(prev => {
      const next = new Map(prev);
      next.set(tick.symbol, tick);
      return next;
    });
    setTickHistory(prev => [...prev, tick].slice(-1000)); // Keep last 1000 ticks
  }, [lastMessage]);

  const subscribeToSymbols = useCallback((symbols: string[]) => {
    send({ type: 'subscribe', symbols });
  }, [send]);

  const getPrice = useCallback((symbol: string) => {
    return ticks.get(symbol);
  }, [ticks]);

  return {
    isConnected,
    ticks: Array.from(ticks.values()),
    tickHistory,
    subscribeToSymbols,
    getPrice,
    send,
    ...rest,
  };
}
