'use client';

import { useState } from 'react';

export default function Landing() {
  const [runCell, setRunCell] = useState(1);

  return (
    <main className="min-h-screen bg-[#0E1117] font-mono text-gray-300 p-4 md:p-8">
      {/* Terminal Header */}
      <div className="flex items-center gap-2 mb-8 text-sm text-gray-500">
        <span className="text-green-400">●</span>
        <span>starktrade_v2.ipynb</span>
        <span className="ml-auto">Python 3.11</span>
      </div>

      {/* Cell 1: The Hook */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 text-xs">
          <span className="text-gray-500">In [1]:</span>
          <span className="text-purple-400">import</span> <span className="text-yellow-400">starktrade</span>.<span className="text-yellow-400">core</span>
          <span className="text-purple-400">as</span> <span className="text-yellow-400">st</span>
        </div>
        <div className="bg-[#161B22] rounded p-4 border border-gray-800">
          <pre className="text-sm text-gray-400 whitespace-pre-wrap">
<span className="text-purple-400">from</span> starktrade.agents <span className="text-purple-400">import</span> [Regime, Quant, Sentiment, Pattern, Risk, Memory, Orchestrator]
<span className="text-purple-400">from</span> starktrade.filters <span className="text-purple-400">import</span> EMA200

<span className="text-gray-500"># Initialize the consensus engine</span>
engine = Orchestrator(agents=<span className="text-orange-400">7</span>, filter=EMA200)

<span className="text-gray-500"># Define objective</span>
<span className="text-purple-400">print</span>(<span className="text-yellow-400">"STOP GAMBLING. START CALCULATING."</span>)
          </pre>
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs">
          <button onClick={() => setRunCell(1)} className="text-green-400 flex items-center gap-1">
            <span className="text-green-400">▶</span> Run Cell
          </button>
        </div>
        {runCell >= 1 && (
          <div className="mt-2">
            <div className="bg-[#161B22] rounded p-4 border-l-2 border-green-500">
              <pre className="text-xl font-bold text-white whitespace-pre-wrap">
STOP GAMBLING. START CALCULATING.
<span className="text-green-400">7-AGENT AI CONSENSUS FOR XAU/USD</span>
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Cell 2: Backtest */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 text-xs">
          <span className="text-gray-500">In [2]:</span>
          <span className="text-yellow-400">starktrade</span>.<span className="text-yellow-400">backtest</span>(days=<span className="text-orange-400">504</span>)
        </div>
        <div className="bg-[#161B22] rounded p-4 border border-gray-800 text-sm text-gray-400">
          # 504 trading days (2 years) | 200 EMA filter non-negotiable
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs">
          <button onClick={() => setRunCell(2)} className="text-green-400 flex items-center gap-1">
            <span className="text-green-400">▶</span> Run Cell
          </button>
        </div>
        {runCell >= 2 && (
          <div className="mt-2">
            <div className="bg-[#161B22] rounded p-4 border-l-2 border-green-500">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><div className="text-3xl font-bold text-green-400">75%</div><div className="text-xs text-gray-500">Win Rate</div></div>
                <div><div className="text-3xl font-bold text-green-400">+14%</div><div className="text-xs text-gray-500">Return</div></div>
                <div><div className="text-3xl font-bold text-cyan-400">1.69</div><div className="text-xs text-gray-500">Sharpe</div></div>
                <div><div className="text-3xl font-bold text-yellow-400">200</div><div className="text-xs text-gray-500">EMA Filter</div></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cell 3: Agents */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 text-xs">
          <span className="text-gray-500">In [3]:</span>
          <span className="text-yellow-400">engine</span>.<span className="text-yellow-400">status</span>()
        </div>
        <div className="bg-[#161B22] rounded p-4 border border-gray-800 text-sm text-gray-400">
          # 7-AGENT CONSENSUS ENGINE
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs">
          <button onClick={() => setRunCell(3)} className="text-green-400 flex items-center gap-1">
            <span className="text-green-400">▶</span> Run Cell
          </button>
        </div>
        {runCell >= 3 && (
          <div className="mt-2">
            <div className="bg-[#161B22] rounded p-4 border-l-2 border-green-500 space-y-2 text-sm">
              <div><span className="text-green-400">[OK]</span> <span className="text-cyan-400">RegimeDetector</span> <span className="text-gray-500">→ ADX + BB + ATR</span></div>
              <div><span className="text-green-400">[OK]</span> <span className="text-cyan-400">QuantAgent</span> <span className="text-gray-500">→ RF + GB ML</span></div>
              <div><span className="text-green-400">[OK]</span> <span className="text-cyan-400">SentimentAgent</span> <span className="text-gray-500">→ ForexFactory</span></div>
              <div><span className="text-green-400">[OK]</span> <span className="text-cyan-400">PatternAgent</span> <span className="text-gray-500">→ Confirmation filter</span></div>
              <div><span className="text-green-400">[OK]</span> <span className="text-cyan-400">RiskAgent</span> <span className="text-gray-500">→ VaR + breakers</span></div>
              <div><span className="text-green-400">[OK]</span> <span className="text-cyan-400">ContextMemory</span> <span className="text-gray-500">→ Dynamic weights</span></div>
              <div><span className="text-green-400">[OK]</span> <span className="text-cyan-400">Orchestrator</span> <span className="text-gray-500">→ ≥3/4 consensus</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Cell 4: CTA */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 text-xs">
          <span className="text-gray-500">In [4]:</span>
          <span className="text-purple-400">await</span> <span className="text-yellow-400">starktrade</span>.<span className="text-yellow-400">subscribe</span>(price=<span className="text-orange-400">299</span>, currency=<span className="text-yellow-400">'ZAR'</span>)
        </div>
        <div className="bg-[#161B22] rounded p-4 border border-gray-800 text-sm text-gray-400">
          # Daily 07:00 UTC signals via Discord
        </div>
        <div className="flex items-center gap-2 mt-2">
          <button className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded flex items-center gap-2">
            <span className="text-white">▶</span> Run Deployment
          </button>
          <span className="text-gray-400 text-sm ml-4">→ <span className="text-yellow-400">R299</span>/month</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-4 border-t border-gray-800 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>© 2026 StarkTrade AI</span>
          <span>Risk warning: Past performance ≠ future results</span>
        </div>
      </div>
    </main>
  );
}# Sat Apr  4 23:36:23 UTC 2026
