'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'analyzing' | 'voting' | 'complete';
  vote?: 'BUY' | 'SELL' | 'HOLD';
  confidence?: number;
  reasoning?: string;
}

interface AgentLiveViewProps {
  wsUrl?: string;
  className?: string;
  demoMode?: boolean;
}

const AGENTS: Agent[] = [
  { id: 'researcher', name: 'Researcher', role: 'News, sentiment, filings', status: 'idle' },
  { id: 'strategist', name: 'Strategist', role: 'Intrinsic value, moat', status: 'idle' },
  { id: 'quant', name: 'Quant', role: 'Statistical arbitrage', status: 'idle' },
  { id: 'fundamentalist', name: 'Fundamentalist', role: '10-K analysis', status: 'idle' },
  { id: 'risk_manager', name: 'Risk Manager', role: 'Gatekeeper', status: 'idle' },
  { id: 'organizer', name: 'Organizer', role: 'Workflow', status: 'idle' },
  { id: 'learner', name: 'Learner', role: 'Learning', status: 'idle' },
];

const REGIME_COLORS: Record<string, string> = {
  BULL: '#00FF88',
  BEAR: '#FF4444',
  SIDEWAYS: '#00D4FF',
  CRISIS: '#FF00FF',
};

export default function AgentLiveView({ 
  wsUrl = 'wss://starktrade-ai.duckdns.org/api/v1/ws', 
  className = '',
  demoMode = true 
}: AgentLiveViewProps) {
  const [agents, setAgents] = useState<Agent[]>(AGENTS);
  const [regime, setRegime] = useState<string>('SIDEWAYS');
  const [system2Status, setSystem2Status] = useState<string>('IDLE');
  const [consensus, setConsensus] = useState<{ action: string; confidence: number; reasoning: string } | null>(null);
  const [riskDecision, setRiskDecision] = useState<'PENDING' | 'APPROVED' | 'BLOCKED'>('PENDING');
  const [connected, setConnected] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (ws?.readyState === WebSocket.OPEN) return;
    const socket = new WebSocket(wsUrl);
    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'agent_status') {
          setAgents(prev => prev.map(a => a.id === data.agent_id ? { ...a, status: data.status, vote: data.vote, confidence: data.confidence, reasoning: data.reasoning } : a));
        } else if (data.type === 'system2_regime') {
          setRegime(data.regime);
          setSystem2Status('COMPLETE');
        } else if (data.type === 'risk_decision') {
          setRiskDecision(data.approved ? 'APPROVED' : 'BLOCKED');
        } else if (data.type === 'consensus') {
          setConsensus({ action: data.action, confidence: data.confidence, reasoning: data.reasoning });
        } else if (data.type === 'analysis_start') {
          setAgents(AGENTS);
          setConsensus(null);
          setRiskDecision('PENDING');
          setSystem2Status('RUNNING');
        }
      } catch (e) {
        console.error('WS parse error:', e);
      }
    };
    setWs(socket);
  }, [wsUrl, ws]);

  useEffect(() => {
    if (!demoMode) connect();
    return () => ws?.close();
  }, [demoMode, connect, ws]);

  useEffect(() => {
    if (!demoMode) return;
    const demoInterval = setInterval(() => {
      setAgents(prev => {
        const activeIdx = prev.findIndex(a => a.status === 'analyzing');
        if (activeIdx === -1) {
          const newAgents: Agent[] = prev.map((a, i) => ({
            ...a,
            status: (i === 0 ? 'analyzing' : 'idle') as Agent['status'],
            vote: undefined,
            confidence: undefined,
          }));
          setSystem2Status('RUNNING');
          setConsensus(null);
          setRiskDecision('PENDING');
          setRegime(['BULL', 'BEAR', 'SIDEWAYS', 'CRISIS'][Math.floor(Math.random() * 4)]);
          return newAgents;
        }
        const votes: ('BUY' | 'SELL' | 'HOLD')[] = ['BUY', 'SELL', 'HOLD'];
        const updated = [...prev];
        updated[activeIdx] = {
          ...updated[activeIdx],
          status: 'voting' as Agent['status'],
          vote: votes[Math.floor(Math.random() * 3)],
          confidence: Math.floor(Math.random() * 30) + 70,
          reasoning: 'Analysis complete. Bullish momentum detected',
        };
        if (activeIdx < 6) {
          updated[activeIdx + 1] = { ...updated[activeIdx + 1], status: 'analyzing' as Agent['status'] };
        } else if (activeIdx === 6) {
          setTimeout(() => {
            setRiskDecision(Math.random() > 0.2 ? 'APPROVED' : 'BLOCKED');
            setTimeout(() => {
              const buyVotes = updated.filter(a => a.vote === 'BUY').length;
              const sellVotes = updated.filter(a => a.vote === 'SELL').length;
              setConsensus({
                action: buyVotes > sellVotes ? 'BUY' : sellVotes > buyVotes ? 'SELL' : 'HOLD',
                confidence: Math.floor(Math.random() * 20) + 75,
                reasoning: `${Math.max(buyVotes, sellVotes)}/7 agents agreed`,
              });
              setSystem2Status('COMPLETE');
            }, 1000);
          }, 500);
        }
        return updated;
      });
    }, 800);
    return () => clearInterval(demoInterval);
  }, [demoMode]);

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'analyzing': return '#00D4FF';
      case 'voting': return '#FFD700';
      case 'complete': return '#00FF88';
      default: return 'rgba(255,255,255,0.1)';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${(connected || demoMode) ? 'bg-[#00FF88] animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs text-white/40 font-mono">{(connected || demoMode) ? 'LIVE' : 'OFFLINE'}</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40 font-mono">SYSTEM 2:</span>
            <span className="text-sm font-mono" style={{ color: REGIME_COLORS[regime] }}>{regime}</span>
          </div>
        </div>
        <div className="text-xs text-white/40 font-mono">HRM ANALYSIS</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <AnimatePresence>
          {agents.map((agent, idx) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="relative overflow-hidden rounded-lg border"
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderColor: agent.status === 'analyzing' ? '#00D4FF' : 'rgba(0,212,255,0.15)',
              }}
            >
              <motion.div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: getStatusColor(agent.status) }} animate={agent.status === 'analyzing' ? { width: ['0%', '100%'] } : undefined} transition={agent.status === 'analyzing' ? { duration: 0.8, repeat: Infinity } : undefined} />
              <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-white">{agent.name}</span>
                  {agent.status === 'analyzing' && <motion.span className="text-[10px] text-[#00D4FF]" animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 0.5, repeat: Infinity }}>ANALYZING</motion.span>}
                  {agent.status === 'voting' && <span className="text-[10px] text-[#FFD700]">VOTING</span>}
                  {agent.status === 'complete' && <span className="text-[10px] text-[#00FF88]">✓</span>}
                </div>
                <div className="text-[10px] text-white/30 mb-2">{agent.role}</div>
                {agent.vote && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
                    <span className="text-xs font-mono" style={{ color: agent.vote === 'BUY' ? '#00FF88' : agent.vote === 'SELL' ? '#FF4444' : '#FFD700' }}>{agent.vote}</span>
                    <span className="text-xs font-mono text-white/60">{agent.confidence}%</span>
                  </motion.div>
                )}
              </div>
              {agent.status === 'analyzing' && <div className="absolute inset-0 bg-[#00D4FF]/5 animate-pulse" />}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <motion.div className="rounded-lg border mb-4 p-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: riskDecision === 'PENDING' ? 'rgba(0,212,255,0.15)' : riskDecision === 'APPROVED' ? '#00FF88' : '#FF4444' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-white">Risk Manager</div>
            <motion.div className="text-xs text-white/40" animate={riskDecision === 'PENDING' ? { opacity: [1, 0.5, 1] } : undefined} transition={{ duration: 1, repeat: Infinity }}>{riskDecision === 'PENDING' ? 'EVALUATING...' : ''}</motion.div>
          </div>
          <div className="flex items-center gap-2">
            {riskDecision === 'PENDING' && <div className="h-2 w-2 rounded-full bg-[#00D4FF] animate-pulse" />}
            {riskDecision === 'APPROVED' && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-sm font-mono text-[#00FF88]">✓ APPROVED</motion.span>}
            {riskDecision === 'BLOCKED' && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-sm font-mono text-[#FF4444]">✕ BLOCKED</motion.span>}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {consensus && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border p-4" style={{ background: 'rgba(0,212,255,0.05)', borderColor: '#00D4FF' }}>
            <div className="text-xs text-white/40 mb-2 font-mono">FINAL CONSENSUS</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-2xl font-mono font-bold" style={{ color: consensus.action === 'BUY' ? '#00FF88' : consensus.action === 'SELL' ? '#FF4444' : '#FFD700' }}>{consensus.action}</span>
                <div>
                  <div className="text-sm text-white/60 font-mono">Confidence: {consensus.confidence}%</div>
                  <div className="text-xs text-white/40">{consensus.reasoning}</div>
                </div>
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-4 py-2 rounded bg-[#00D4FF]/20 border text-sm font-mono" style={{ borderColor: '#00D4FF', color: '#00D4FF' }}>EXECUTE →</motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>
    </div>
  );
}
