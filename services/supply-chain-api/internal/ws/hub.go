package ws

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog/log"
)

const (
	writeWait         = 10 * time.Second
	pongWait          = 60 * time.Second
	pingPeriod        = (pongWait * 9) / 10
	maxMessageSize    = 4096
	maxConnLifetime   = 50 * time.Minute
)

// Message is a JSON envelope sent to WebSocket clients.
type Message struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

// Client wraps a single WebSocket connection.
type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
}

// Hub manages a set of connected WebSocket clients and broadcasts messages.
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	done       chan struct{}
	mu         sync.RWMutex
}

// NewHub creates a new Hub.
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		done:       make(chan struct{}),
	}
}

// Run processes register/unregister/broadcast events. Call as a goroutine.
func (h *Hub) Run() {
	for {
		select {
		case <-h.done:
			h.mu.Lock()
			for client := range h.clients {
				close(client.send)
				delete(h.clients, client)
			}
			h.mu.Unlock()
			return

		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Debug().Int("clients", len(h.clients)).Msg("ws client connected")

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			log.Debug().Int("clients", len(h.clients)).Msg("ws client disconnected")

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					// Client buffer full — disconnect
					h.mu.RUnlock()
					h.mu.Lock()
					delete(h.clients, client)
					close(client.send)
					h.mu.Unlock()
					h.mu.RLock()
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Broadcast sends a typed message to all connected clients.
func (h *Hub) Broadcast(msgType string, data interface{}) {
	msg := Message{Type: msgType, Data: data}
	b, err := json.Marshal(msg)
	if err != nil {
		log.Error().Err(err).Msg("failed to marshal ws message")
		return
	}
	h.broadcast <- b
}

// ClientCount returns current number of connected clients.
func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// Shutdown gracefully closes all client connections and stops the Run loop.
func (h *Hub) Shutdown() {
	close(h.done)
}

// ServeClient registers a new client from an upgraded WebSocket connection.
func (h *Hub) ServeClient(conn *websocket.Conn) {
	client := &Client{
		hub:  h,
		conn: conn,
		send: make(chan []byte, 256),
	}
	h.register <- client

	go client.writePump()
	client.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	lifetimeTimer := time.NewTimer(maxConnLifetime)
	defer lifetimeTimer.Stop()

	msgCh := make(chan error, 1)
	go func() {
		for {
			_, _, err := c.conn.ReadMessage()
			if err != nil {
				msgCh <- err
				return
			}
		}
	}()

	select {
	case err := <-msgCh:
		if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
			log.Debug().Err(err).Msg("ws read error")
		}
	case <-lifetimeTimer.C:
		log.Debug().Msg("ws connection lifetime exceeded, closing")
		c.conn.WriteControl(
			websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.CloseNormalClosure, "connection lifetime exceeded"),
			time.Now().Add(writeWait),
		)
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
