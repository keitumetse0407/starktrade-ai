// Package risk implements the risk management engine.
package risk

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"
)

// Order is a minimal order type for risk checks.
type Order struct {
	ID       string  `json:"id"`
	Symbol   string  `json:"symbol"`
	Side     string  `json:"side"`
	Quantity float64 `json:"quantity"`
	Price    float64 `json:"price,omitempty"`
}

// Engine implements risk checks.
type Engine struct {
	maxPosition     float64
	maxDrawdown     float64
	dailyLossLimit  float64
	dailyPnL        float64
	totalPnL        float64
	peakValue       float64
	currentValue    float64
	isHalted        bool
	sectorExposure  map[string]float64
	mu              sync.RWMutex
}

// Config holds risk parameters.
type Config struct {
	MaxPosition    float64
	MaxDrawdown    float64
	DailyLossLimit float64
}

// NewEngine creates a new risk engine.
func NewEngine(cfg *Config) *Engine {
	return &Engine{
		maxPosition:    cfg.MaxPosition,
		maxDrawdown:    cfg.MaxDrawdown,
		dailyLossLimit: cfg.DailyLossLimit,
		currentValue:   100000.0,
		peakValue:      100000.0,
		sectorExposure: make(map[string]float64),
	}
}

// CheckOrder validates an order against risk rules.
func (e *Engine) CheckOrder(order Order) (bool, string) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	// Rule 1: Halt check
	if e.isHalted {
		return false, "TRADING HALTED: Circuit breaker active (8% drawdown breached)"
	}

	// Rule 2: Daily loss limit
	if e.dailyPnL/e.peakValue <= -e.dailyLossLimit {
		return false, "DAILY STOP: 3% daily loss limit reached"
	}

	// Rule 3: Position size limit
	orderValue := order.Quantity * order.Price
	if orderValue/e.currentValue > e.maxPosition {
		return false, "POSITION SIZE EXCEEDS 5% LIMIT"
	}

	// Rule 4: Risk/reward ratio check (simplified)
	// In production, check stop_loss/take_profit levels

	log.Printf("Risk check PASSED for order %s: %s %s", order.ID, order.Side, order.Symbol)
	return true, "APPROVED"
}

// Status returns current risk status.
func (e *Engine) Status() map[string]interface{} {
	e.mu.RLock()
	defer e.mu.RUnlock()

	drawdown := 0.0
	if e.peakValue > 0 {
		drawdown = (e.peakValue - e.currentValue) / e.peakValue
	}

	return map[string]interface{}{
		"halted":            e.isHalted,
		"daily_pnl":         e.dailyPnL,
		"total_pnl":         e.totalPnL,
		"current_value":     e.currentValue,
		"peak_value":        e.peakValue,
		"drawdown_pct":      drawdown * 100,
		"daily_loss_pct":    (e.dailyPnL / e.peakValue) * 100,
		"sector_exposure":   e.sectorExposure,
		"max_position_pct":  e.maxPosition * 100,
		"max_drawdown_pct":  e.maxDrawdown * 100,
		"daily_loss_limit":  e.dailyLossLimit * 100,
		"last_updated":      time.Now().UTC(),
	}
}

// StatusHandler returns risk status as JSON.
func (e *Engine) StatusHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(e.Status())
}

// UpdatePnL updates daily P&L and checks circuit breakers.
func (e *Engine) UpdatePnL(pnl float64) {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.dailyPnL += pnl
	e.totalPnL += pnl
	e.currentValue += pnl

	if e.currentValue > e.peakValue {
		e.peakValue = e.currentValue
	}

	drawdown := (e.peakValue - e.currentValue) / e.peakValue
	if drawdown >= e.maxDrawdown {
		e.isHalted = true
		log.Printf("CIRCUIT BREAKER: %.2f%% drawdown — ALL TRADING HALTED", drawdown*100)
	}
}
