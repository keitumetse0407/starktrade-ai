'use client';

import { memo, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Shield, Target, TrendingUp, Activity, Zap, Cpu,
  CheckCircle, XCircle, Clock, ChevronRight, Wifi, WifiOff,
  ArrowUpRight, ArrowDownRight, Minus, RefreshCw
} from 'lucide-react';

const WS_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_WS_URL || 'wss://starktrade-ai.duckdns.org/api/v1/ws')
  : 'wss://starktrade-ai.duckdns.org/api/v1/ws';

interface AgentState {
  id: string;
  name: string;
  role: string;
  emoji: string;
  status: 'idle' | 'analyzing' | 'voting' | 'complete';
  vote?: 'BUY' | 'SELL' | 'HOLD';
  confidence?: number;
  reasoning?: string;
  progress: number;
}

interface AgentVote {
  agent: string;
  vote: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning?: string;
}

interface RegimeState {
  regime: 'BULL' | 'BEAR' | 'SIDEWAYS' | 'TRANSITION' | 'CRISIS';
  confidence: number;
  lastUpdate: string;
}

interface ConsensusState {
  finalDecision: 'BUY' | 'SELL' | 'HOLD';
  totalBuy: number;
  totalSell: number;
  totalHold: number;
  avgConfidence: number;
  reasoning: string;
  riskApproved: boolean;
  timestamp: string;
}

interface MarketTick {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
}

const DEFAULT_AGENTS: AgentState[] = [
  { id: 'quant', name: 'Quant Agent', role: 'ML Price Prediction', emoji: '📊', status: 'idle', progress: 0 },
  { id: 'sentiment', name: 'Sentiment Agent', role: 'News & Social Sentiment', emoji: '🗞️', status: 'idle', progress: 0 },
  { id: 'pattern', name: 'Pattern Agent', role: 'Technical Patterns', emoji: '📈', status: 'idle', progress: 0 },
  { id: 'risk', name: 'Risk Agent', role: 'Portfolio Risk', emoji: '🛡️', status: 'idle', progress: 0 },
  { id: 'regime', name: 'Regime Detector', role: 'Market Regime', emoji: '🌊', status: 'idle', progress: 0 },
  { id: 'orchestrator', name: 'Orchestrator', role: 'Consensus Engine', emoji: '⚡', status: 'idle', progress: 0 },
  { id: 'context', name: 'Context Memory', role: 'Persistent Learning', emoji: '🧠', status: 'idle', progress: 0 },
];

const REGIME_COLORS: Record<string, string> = {
  BULL: 'text-green-400 border-green-400/30 bg-green-400/5',
  BEAR: 'text-red-400 border-red-400/30 bg-red-400/5',
  SIDEWAYS: 'text-amber-400 border-amber-400/30 bg-amber-400/5',
  TRANSITION: 'text-blue-400 border-blue-400/30 bg-blue-400/5',
  CRISIS: 'text-red-500 border-red-500/50 bg-red-500/10',
};

const VOTE_COLORS: Record<string, string> = {
  BUY: 'text-green-400',
  SELL: 'text-red-400',
  HOLD: 'text-amber-400',
};

function throttle<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let lastCall = 0;
  return (() => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return fn(...arguments);
    }
  }) as T;
}

function detectPerformance(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as { deviceMemory?: number };
  if (nav.deviceMemory && nav.deviceMemory <= 2) return true;
  return false;
}

const useAgentWebSocket = (room: string = 'agents') => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<Record<string, unknown> | null>(null);
  
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const wsUrl = token ? `${WS_URL}/${room}?token=${token}` : `${WS_URL}/${room}`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        setIsConnected(true);
        reconnectCountRef.current = 0;
        console.log('[AgentLiveView] Connected');
      };
      
      wsRef.current.onclose = () => {
        setIsConnected(false);
        if (reconnectCountRef.current < 5) {
          const delay = 3000 * Math.pow(1.5, reconnectCountRef.current);
          reconnectCountRef.current++;
          setTimeout(connect, delay);
        }
      };
      
      wsRef.current.onerror = () => setIsConnected(false);
      
      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);
        } catch {}
      };
    } catch {
      setIsConnected(false);
    }
  }, [room]);
  
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);
  
  const send = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);
  
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);
  
  return { isConnected, lastMessage, send, connect, disconnect };
};

const useAgentStateSync = (wsConnected: boolean, fetchState: () => Promise<void>) => {
  useEffect(() => {
    if (!wsConnected) return;
    const timeout = setTimeout(fetchState, 500);
    return () => clearTimeout(timeout);
  }, [wsConnected, fetchState]);
};

export const AgentLiveView = memo(function AgentLiveView() {
  const { isConnected: wsConnected, lastMessage } = useAgentWebSocket('agents');
  const [agents, setAgents] = useState<AgentState[]>(DEFAULT_AGENTS);
  const [regime, setRegime] = useState<RegimeState>({
    regime: 'SIDEWAYS',
    confidence: 72,
    lastUpdate: new Date().toISOString(),
  });
  const [votes, setVotes] = useState<AgentVote[]>([]);
  const [consensus, setConsensus] = useState<ConsensusState | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisCycle, setAnalysisCycle] = useState(0);
  const [lowPerfMode, setLowPerfMode] = useState(false);
  const [marketPulse, setMarketPulse] = useState<Map<string, MarketTick>>(new Map());
  const frameRef = useRef(0);
  const lastUpdateRef = useRef(0);
  
  const fetchCurrentState = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/agents/state`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.agents) setAgents(data.agents);
        if (data.regime) setRegime(data.regime);
        if (data.consensus) setConsensus(data.consensus);
        if (data.votes) setVotes(data.votes);
      }
    } catch {}
  }, []);
  
  useEffect(() => {
    setLowPerfMode(detectPerformance());
  }, []);
  
  useEffect(() => {
    if (!lastMessage) return;
    
    const now = Date.now();
    if (now - lastUpdateRef.current < (lowPerfMode ? 500 : 100)) return;
    lastUpdateRef.current = now;
    
    switch (lastMessage.type) {
      case 'agent_status': {
        const msg = lastMessage as unknown as { agent: string; status: string; emoji: string; role: string };
        setAgents(prev => prev.map(a => 
          a.id === msg.agent ? { ...a, status: msg.status as AgentState['status'], emoji: msg.emoji, role: msg.role } : a
        ));
        break;
      }
      case 'agent_activity': {
        const msg = lastMessage as unknown as { activity_type: string; agent: string; priority: string };
        if (msg.activity_type === 'analysis_start') {
          setIsAnalyzing(true);
          setAnalysisCycle(c => c + 1);
          setVotes([]);
          setConsensus(null);
          setAgents(prev => prev.map(a => ({ ...a, status: 'analyzing' as const, progress: 0 })));
        } else if (msg.activity_type === 'analysis_complete') {
          setIsAnalyzing(false);
          setAgents(prev => prev.map(a => ({ ...a, status: 'complete' as const, progress: 100 })));
        }
        break;
      }
      case 'agent_vote': {
        const msg = lastMessage as unknown as AgentVote;
        setAgents(prev => prev.map(a => 
          a.id === msg.agent ? { ...a, status: 'voting' as const, vote: msg.vote, confidence: msg.confidence, reasoning: msg.reasoning, progress: 75 } : a
        ));
        setVotes(prev => [...prev.filter(v => v.agent !== msg.agent), msg]);
        break;
      }
      case 'regime_change': {
        const msg = lastMessage as unknown as { regime: string; confidence: number };
        setRegime({ regime: msg.regime as RegimeState['regime'], confidence: msg.confidence, lastUpdate: new Date().toISOString() });
        break;
      }
      case 'consensus': {
        const msg = lastMessage as unknown as ConsensusState;
        setConsensus(msg);
        setAgents(prev => prev.map(a => ({ ...a, status: 'complete' as const, progress: 100 })));
        break;
      }
      case 'tick': {
        const msg = lastMessage as unknown as MarketTick;
        setMarketPulse(prev => new Map(prev).set(msg.symbol, msg));
        break;
      }
    }
  }, [lastMessage, lowPerfMode]);
  
  useAgentStateSync(wsConnected, fetchCurrentState);
  
  const animationDuration = lowPerfMode ? 0 : 0.3;
  
  return (
    <div className="space-y-4">
      {/* Header with Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-white">Live Agent Council</h3>
          <span className="text-xs text-white/40">#{analysisCycle}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-xs text-white/60">{wsConnected ? 'Live' : 'Offline'}</span>
        </div>
      </div>
      
      {/* System 2 Regime Display */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-4 rounded-xl border ${REGIME_COLORS[regime.regime]} flex items-center justify-between`}
      >
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5" />
          <div>
            <p className="text-xs text-white/40">System 2 Regime</p>
            <p className="text-lg font-bold font-mono">{regime.regime}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/40">Confidence</p>
          <p className="text-lg font-mono">{regime.confidence}%</p>
        </div>
      </motion.div>
      
      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} lowPerfMode={lowPerfMode} animationDuration={animationDuration} />
        ))}
      </div>
      
      {/* Risk Manager Gating */}
      <RiskManagerGate approved={consensus?.riskApproved ?? true} />
      
      {/* Final Consensus */}
      <AnimatePresence>
        {consensus && (
          <ConsensusDisplay consensus={consensus} lowPerfMode={lowPerfMode} animationDuration={animationDuration} />
        )}
      </AnimatePresence>
      
      {/* Market Pulse Ticker */}
      <MarketPulseTickers marketPulse={marketPulse} />
    </div>
  );
});

const AgentCard = memo(function AgentCard({ 
  agent, 
  lowPerfMode, 
  animationDuration 
}: { 
  agent: AgentState;
  lowPerfMode: boolean;
  animationDuration: number;
}) {
  const statusIcons = {
    idle: <Clock className="w-4 h-4 text-white/30" />,
    analyzing: <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />,
    voting: <Target className="w-4 h-4 text-amber-400 animate-pulse" />,
    complete: agent.vote === 'BUY' ? <ArrowUpRight className="w-4 h-4 text-green-400" /> :
               agent.vote === 'SELL' ? <ArrowDownRight className="w-4 h-4 text-red-400" /> :
               <Minus className="w-4 h-4 text-amber-400" />,
  };
  
  const containerClass = `glass-card p-4 rounded-xl border ${
    agent.status === 'analyzing' ? 'border-cyan-400/30 bg-cyan-400/5' :
    agent.status === 'complete' ? 'border-green-400/20' :
    'border-white/[0.06]'
  }`;
  
  if (lowPerfMode) {
    return (
      <div className={containerClass}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{agent.emoji}</span>
          <span className="text-sm font-medium text-white truncate">{agent.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {statusIcons[agent.status]}
          <span className="text-xs text-white/60">{agent.status}</span>
        </div>
        {agent.vote && (
          <span className={`text-sm font-mono ${VOTE_COLORS[agent.vote]}`}>
            {agent.vote} {agent.confidence}%
          </span>
        )}
      </div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: animationDuration }}
      className={containerClass}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{agent.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{agent.name}</p>
          <p className="text-[10px] text-white/30 truncate">{agent.role}</p>
        </div>
        {statusIcons[agent.status]}
      </div>
      
      {/* Progress Bar */}
      {agent.status !== 'idle' && (
        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden mb-3">
          <motion.div
            className="h-full bg-cyan-400"
            initial={{ width: 0 }}
            animate={{ width: `${agent.progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}
      
      {/* Vote Display */}
      {agent.vote && (
        <div className="flex items-center justify-between">
          <span className={`text-lg font-bold font-mono ${VOTE_COLORS[agent.vote]}`}>
            {agent.vote}
          </span>
          <span className="text-sm font-mono text-white/60">
            {agent.confidence}%
          </span>
        </div>
      )}
      
      {/* Reasoning Preview */}
      {agent.reasoning && (
        <p className="text-[10px] text-white/40 mt-2 line-clamp-2">
          {agent.reasoning}
        </p>
      )}
    </motion.div>
  );
});

const RiskManagerGate = memo(function RiskManagerGate({ approved }: { approved: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border flex items-center gap-4 ${
        approved 
          ? 'border-green-400/30 bg-green-400/5' 
          : 'border-red-400/30 bg-red-400/5'
      }`}
    >
      <Shield className={`w-6 h-6 ${approved ? 'text-green-400' : 'text-red-400'}`} />
      <div className="flex-1">
        <p className="text-xs text-white/40">Risk Manager</p>
        <p className={`text-lg font-bold font-mono ${approved ? 'text-green-400' : 'text-red-400'}`}>
          {approved ? 'APPROVED' : 'BLOCKED'}
        </p>
      </div>
      {approved ? (
        <CheckCircle className="w-6 h-6 text-green-400" />
      ) : (
        <XCircle className="w-6 h-6 text-red-400" />
      )}
    </motion.div>
  );
});

const ConsensusDisplay = memo(function ConsensusDisplay({
  consensus,
  lowPerfMode,
  animationDuration,
}: {
  consensus: ConsensusState;
  lowPerfMode: boolean;
  animationDuration: number;
}) {
  if (lowPerfMode) {
    return (
      <div className="glass-card p-4 rounded-xl border border-cyan-400/30 bg-cyan-400/5">
        <p className="text-sm text-white">Final Decision: <span className={`font-mono font-bold ${VOTE_COLORS[consensus.finalDecision]}`}>{consensus.finalDecision}</span></p>
      </div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: animationDuration }}
      className="glass-card p-6 rounded-xl border border-cyan-400/30 bg-cyan-400/5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-cyan-400" />
        <h4 className="font-semibold text-white">Final Consensus</h4>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 rounded-lg bg-green-400/10">
          <p className="text-2xl font-bold font-mono text-green-400">{consensus.totalBuy}</p>
          <p className="text-xs text-white/40">BUY</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-red-400/10">
          <p className="text-2xl font-bold font-mono text-red-400">{consensus.totalSell}</p>
          <p className="text-xs text-white/40">SELL</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-amber-400/10">
          <p className="text-2xl font-bold font-mono text-amber-400">{consensus.totalHold}</p>
          <p className="text-xs text-white/40">HOLD</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-white/40">Decision</p>
          <p className={`text-2xl font-bold font-mono ${VOTE_COLORS[consensus.finalDecision]}`}>
            {consensus.finalDecision}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/40">Avg Confidence</p>
          <p className="text-xl font-mono text-cyan-400">{consensus.avgConfidence}%</p>
        </div>
      </div>
      
      {consensus.reasoning && (
        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
          <p className="text-xs text-white/40 mb-1">Reasoning</p>
          <p className="text-sm text-white/80">{consensus.reasoning}</p>
        </div>
      )}
    </motion.div>
  );
});

const MarketPulseTickers = memo(function MarketPulseTickers({
  marketPulse,
}: {
  marketPulse: Map<string, MarketTick>;
}) {
  const symbols = useMemo(() => ['BTC', 'ETH', 'SPY', 'GOLD', 'VIX'], []);
  
  if (marketPulse.size === 0) {
    return (
      <div className="flex gap-2 overflow-x-auto py-2">
        {symbols.map(sym => (
          <div key={sym} className="flex-shrink-0 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <p className="text-xs text-white/40">{sym}</p>
            <p className="text-sm font-mono text-white/60">---</p>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="flex gap-2 overflow-x-auto py-2">
      {symbols.map(sym => {
        const tick = marketPulse.get(sym);
        if (!tick) return null;
        return (
          <div key={sym} className="flex-shrink-0 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <p className="text-xs text-white/40">{sym}</p>
            <p className="text-sm font-mono text-white">{tick.price.toFixed(2)}</p>
            <p className={`text-xs font-mono ${tick.changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {tick.changePct >= 0 ? '+' : ''}{tick.changePct.toFixed(2)}%
            </p>
          </div>
        );
      })}
    </div>
  );
});

export default AgentLiveView;