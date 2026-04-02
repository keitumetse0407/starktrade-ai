// Package engine implements the core trading engine.
package engine

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"
)

// Config holds engine configuration.
type Config struct {
	Port           string
	ReadTimeout    time.Duration
	WriteTimeout   time.Duration
	MaxPosition    float64
	MaxDrawdown    float64
	DailyLossLimit float64
}

// Engine is the core trading engine.
type Engine struct {
	config      *Config
	riskEngine  RiskChecker
	wsHub       WSBroadcaster
	orders      chan Order
	positions   map[string]*Position
	mu          sync.RWMutex
}

// Order represents a trade order.
type Order struct {
	ID        string    `json:"id"`
	Symbol    string    `json:"symbol"`
	Side      string    `json:"side"` // buy/sell
	Quantity  float64   `json:"quantity"`
	Type      string    `json:"type"` // market/limit
	Price     float64   `json:"price,omitempty"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

// Position represents an open position.
type Position struct {
	Symbol        string    `json:"symbol"`
	Side          string    `json:"side"`
	Quantity      float64   `json:"quantity"`
	EntryPrice    float64   `json:"entry_price"`
	CurrentPrice  float64   `json:"current_price"`
	UnrealizedPnL float64   `json:"unrealized_pnl"`
	OpenedAt      time.Time `json:"opened_at"`
}

// RiskChecker interface for risk validation.
type RiskChecker interface {
	CheckOrder(order Order) (bool, string)
	Status() map[string]interface{}
}

// WSBroadcaster interface for WebSocket broadcasts.
type WSBroadcaster interface {
	Broadcast(msg interface{})
}

// New creates a new trading engine.
func New(cfg *Config, risk RiskChecker, hub WSBroadcaster) *Engine {
	return &Engine{
		config:    cfg,
		riskEngine: risk,
		wsHub:     hub,
		orders:    make(chan Order, 1000),
		positions: make(map[string]*Position),
	}
}

// RunMarketMonitor monitors market data in a goroutine.
func (e *Engine) RunMarketMonitor(ctx context.Context) {
	log.Println("Market monitor started")
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("Market monitor stopping")
			return
		case <-ticker.C:
			e.updatePositions()
		}
	}
}

// RunOrderProcessor processes orders from the queue.
func (e *Engine) RunOrderProcessor(ctx context.Context) {
	log.Println("Order processor started")
	for {
		select {
		case <-ctx.Done():
			log.Println("Order processor stopping")
			return
		case order := <-e.orders:
			e.processOrder(order)
		}
	}
}

// ExecuteHandler handles trade execution requests.
func (e *Engine) ExecuteHandler(w http.ResponseWriter, r *http.Request) {
	var order Order
	if err := json.NewDecoder(r.Body).Decode(&order); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	order.Status = "pending"
	order.CreatedAt = time.Now().UTC()

	// Risk check
	approved, reason := e.riskEngine.CheckOrder(order)
	if !approved {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "rejected",
			"reason": reason,
		})
		return
	}

	// Queue for execution
	order.Status = "queued"
	e.orders <- order

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":      "accepted",
		"order_id":    order.ID,
		"fill_price":  e.getCurrentPrice(order.Symbol),
		"executed_at": time.Now().UTC(),
	})
}

// PositionsHandler returns current positions.
func (e *Engine) PositionsHandler(w http.ResponseWriter, r *http.Request) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	positions := make([]*Position, 0, len(e.positions))
	for _, p := range e.positions {
		positions = append(positions, p)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(positions)
}

func (e *Engine) processOrder(order Order) {
	e.mu.Lock()
	defer e.mu.Unlock()

	pos, exists := e.positions[order.Symbol]
	if order.Side == "buy" {
		if exists && pos.Side == "long" {
			// Add to position
			totalCost := pos.EntryPrice*pos.Quantity + order.Price*order.Quantity
			pos.Quantity += order.Quantity
			pos.EntryPrice = totalCost / pos.Quantity
		} else {
			e.positions[order.Symbol] = &Position{
				Symbol:     order.Symbol,
				Side:       "long",
				Quantity:   order.Quantity,
				EntryPrice: order.Price,
				OpenedAt:   time.Now().UTC(),
			}
		}
	} else if order.Side == "sell" {
		if exists {
			delete(e.positions, order.Symbol)
		}
	}

	log.Printf("Order executed: %s %s %f @ %f", order.Side, order.Symbol, order.Quantity, order.Price)
	e.wsHub.Broadcast(map[string]interface{}{
		"type":       "order_executed",
		"order":      order,
		"position":   e.positions[order.Symbol],
		"timestamp":  time.Now().UTC(),
	})
}

func (e *Engine) updatePositions() {
	e.mu.RLock()
	defer e.mu.RUnlock()

	for _, pos := range e.positions {
		pos.CurrentPrice = e.getCurrentPrice(pos.Symbol)
		if pos.Side == "long" {
			pos.UnrealizedPnL = (pos.CurrentPrice - pos.EntryPrice) * pos.Quantity
		} else {
			pos.UnrealizedPnL = (pos.EntryPrice - pos.CurrentPrice) * pos.Quantity
		}
	}
}

func (e *Engine) getCurrentPrice(symbol string) float64 {
	// Stub — integrate with real market data feed
	prices := map[string]float64{
		"SPY":    478.50,
		"AAPL":   178.25,
		"NVDA":   875.30,
		"BTC-USD": 67500.00,
		"ETH-USD": 3450.00,
	}
	if p, ok := prices[symbol]; ok {
		return p
	}
	return 100.0
}
