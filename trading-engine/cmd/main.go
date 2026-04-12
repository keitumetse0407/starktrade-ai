// StarkTrade AI — Trading Engine Entry Point
// Go 1.22+ with goroutines for concurrent execution
package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"starktrade-ai/trading-engine/internal/engine"
	"starktrade-ai/trading-engine/internal/risk"
	"starktrade-ai/trading-engine/internal/websocket"

	"github.com/gorilla/mux"
)


type riskAdapt struct{ e *risk.Engine }
func (a *riskAdapt) Status() map[string]interface{} { return a.e.Status() }
func (a *riskAdapt) CheckOrder(o engine.Order) (bool, string) {
	return a.e.CheckOrder(risk.Order{ID: o.ID, Symbol: o.Symbol, Side: o.Side, Quantity: o.Quantity, Price: o.Price})
}

func main() {
	cfg := &engine.Config{
		Port:          getEnv("PORT", "8081"),
		ReadTimeout:   30 * time.Second,
		WriteTimeout:  30 * time.Second,
		MaxPosition:   0.05,  // 5% max position
		MaxDrawdown:   0.08,  // 8% halt
		DailyLossLimit: 0.03, // 3% daily stop
	}

	riskCfg := &risk.Config{MaxPosition: cfg.MaxPosition, MaxDrawdown: cfg.MaxDrawdown, DailyLossLimit: cfg.DailyLossLimit}
	riskEngine := risk.NewEngine(riskCfg)
	wsHub := websocket.NewHub()
	riskAdapt := &riskAdapt{e: riskEngine}
	tradingEngine := engine.New(cfg, riskAdapt, wsHub)

	// Start background goroutines
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go wsHub.Run(ctx)
	go tradingEngine.RunMarketMonitor(ctx)
	go tradingEngine.RunOrderProcessor(ctx)

	// HTTP routes
	r := mux.NewRouter()
	r.HandleFunc("/api/health", healthHandler).Methods("GET")
	r.HandleFunc("/api/execute", tradingEngine.ExecuteHandler).Methods("POST")
	r.HandleFunc("/api/positions", tradingEngine.PositionsHandler).Methods("GET")
	r.HandleFunc("/api/risk/status", riskEngine.StatusHandler).Methods("GET")
	r.HandleFunc("/ws", wsHub.WebSocketHandler)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
	}

	go func() {
		log.Printf("Trading engine starting on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	cancel()
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	srv.Shutdown(shutdownCtx)
	log.Println("Trading engine shut down gracefully")
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "operational",
		"service":   "starktrade-trading-engine",
		"version":   "1.0.0",
		"timestamp": time.Now().UTC(),
	})
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
