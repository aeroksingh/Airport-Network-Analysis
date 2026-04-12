#!/bin/bash
echo ""
echo "=========================================="
echo " AIR TOWER — Starting up"
echo "=========================================="
echo ""

# Kill stale node processes
echo "[1/3] Killing stale Node processes..."
pkill -f "node server.js" 2>/dev/null
pkill -f "react-scripts" 2>/dev/null
sleep 2

# Start backend
echo "[2/3] Starting backend on port 5000..."
cd "$(dirname "$0")/backend" && npm run dev &
BACKEND_PID=$!
sleep 3

# Start frontend
echo "[3/3] Starting frontend..."
cd "$(dirname "$0")/frontend" && npm start &

echo ""
echo "=========================================="
echo " Backend:  http://localhost:5000"
echo " Frontend: http://localhost:3000"
echo " First run: visit /setup to create admin"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop both servers"
wait
