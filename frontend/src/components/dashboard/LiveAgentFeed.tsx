'use client';

import { memo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, AlertTriangle, Brain, Shield, Zap, TrendingUp, Target, X } from 'lucide-react';
import { useAgentFeed } from '@/hooks/useWebSocket';

interface LiveAgentFeedProps {
  maxItems?: number;
  showHeader?: boolean;
  compact?: boolean;
}

const priorityColors = {
  critical: 'border-loss/50 bg-loss/10 text-loss',
  high: 'border-yellow-400/50 bg-yellow-400/10 text-yellow-400',
  medium: 'border-electric/30 bg-electric/5 text-electric',
  low: 'border-white/10 bg-white/5 text-muted',
};

const priorityIcons = {
  critical: <AlertTriangle className="w-4 h-4" />,
  high: <Zap className="w-4 h-4" />,
  medium: <Activity className="w-4 h-4" />,
  low: <Activity className="w-4 h-4" />,
};

export const LiveAgentFeed = memo(function LiveAgentFeed({
  maxItems = 20,
  showHeader = true,
  compact = false,
}: LiveAgentFeedProps) {
  const {
    isConnected,
    activities,
    agentStatuses,
    regimeChanges,
    unreadCount,
    clearUnread,
    clearActivities,
  } = useAgentFeed();

  const feedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top on new activity
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [activities.length]);

  const displayActivities = activities.slice(0, maxItems);

  return (
    <div className="glass-card flex flex-col h-full">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-electric" />
              <h3 className="font-semibold">Live Agent Feed</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-profit animate-pulse' : 'bg-loss'
              }`} />
              <span className="text-xs text-muted">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={clearUnread}
                className="px-2 py-1 rounded text-xs bg-electric/10 text-electric hover:bg-electric/20 transition-colors"
              >
                {unreadCount} new
              </button>
            )}
            <button
              onClick={clearActivities}
              className="p-1.5 rounded hover:bg-white/5 text-muted hover:text-white transition-colors"
              title="Clear feed"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Regime Changes (Critical Alerts) */}
      <AnimatePresence>
        {regimeChanges.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-loss/20"
          >
            {regimeChanges.slice(0, 2).map((regime, i) => (
              <div key={i} className="p-3 bg-loss/10 border-l-2 border-loss flex items-center gap-3">
                <Shield className="w-5 h-5 text-loss flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-loss">{regime.message}</p>
                  <p className="text-xs text-muted">
                    {new Date(regime.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent Status Bar */}
      {!compact && agentStatuses.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 overflow-x-auto">
          {agentStatuses.map((agent) => (
            <div
              key={agent.agent}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 text-xs whitespace-nowrap"
            >
              <span>{agent.emoji}</span>
              <span className="text-muted">{agent.agent}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${
                agent.status === 'active' ? 'bg-profit' :
                agent.status === 'busy' ? 'bg-electric animate-pulse' :
                'bg-muted'
              }`} />
            </div>
          ))}
        </div>
      )}

      {/* Activity Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {displayActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Activity className="w-8 h-8 text-muted/30 mb-2" />
            <p className="text-sm text-muted">Waiting for agent activity...</p>
            <p className="text-xs text-muted/50 mt-1">
              {isConnected ? 'Agents are warming up' : 'Connecting to feed...'}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {displayActivities.map((activity, i) => (
              <motion.div
                key={`${activity.timestamp}-${i}`}
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className={`rounded-lg border p-3 ${priorityColors[activity.priority]} ${
                  i === 0 ? 'ring-1 ring-white/10' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {activity.emoji ? (
                      <span className="text-lg">{activity.emoji}</span>
                    ) : (
                      priorityIcons[activity.priority]
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">{activity.agent}</span>
                      {activity.symbol && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 font-mono">
                          {activity.symbol}
                        </span>
                      )}
                      <span className="text-xs text-muted ml-auto">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className={`text-sm ${compact ? 'truncate' : ''}`}>
                      {activity.activity}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      {!compact && (
        <div className="p-3 border-t border-white/5 flex items-center justify-between text-xs text-muted">
          <span>{activities.length} activities</span>
          <span>HRM Dual-System Active</span>
        </div>
      )}
    </div>
  );
});

// ============================================================
// COMPACT INLINE FEED (for embedding in dashboard)
// ============================================================

export const InlineAgentFeed = memo(function InlineAgentFeed() {
  const { activities, isConnected } = useAgentFeed();
  const latest = activities.slice(0, 5);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-electric" />
          <span className="text-sm font-medium">Agent Activity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${
            isConnected ? 'bg-profit animate-pulse' : 'bg-loss'
          }`} />
          <span className="text-xs text-muted">Live</span>
        </div>
      </div>

      {latest.length === 0 ? (
        <p className="text-xs text-muted text-center py-4">Waiting for activity...</p>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {latest.map((activity, i) => (
              <motion.div
                key={`${activity.timestamp}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-start gap-2 text-xs"
              >
                <span className="flex-shrink-0">{activity.emoji}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-muted">{activity.agent}</span>
                  <span className="text-white/80 ml-1 truncate">{activity.activity}</span>
                </div>
                <span className="text-muted flex-shrink-0">
                  {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
});
