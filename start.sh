#!/usr/bin/env bash
# start.sh — Start both backend and frontend in separate terminals

echo "🚀 Starting OAuth Guide Platform..."

# Check for Gemini API key
if [ ! -f "backend/.env" ]; then
  echo "⚠️  No backend/.env found. Copying from .env.example..."
  cp backend/.env.example backend/.env
  echo "📝 Edit backend/.env and add your GEMINI_API_KEY before using live generation"
fi

# Start backend
echo "▶ Starting backend at http://localhost:8000"
cd backend
if [ ! -d "venv" ]; then
  echo "  Creating Python venv..."
  python3 -m venv venv
  venv/bin/pip install -r requirements.txt -q
fi
venv/bin/uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Give backend a moment to start
sleep 2

# Start frontend
echo "▶ Starting frontend at http://localhost:3000"
cd frontend
if [ ! -d "node_modules" ]; then
  echo "  Installing npm dependencies..."
  npm install --legacy-peer-deps
fi
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Both servers running:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait and clean up on interrupt
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Servers stopped'" INT TERM
wait $BACKEND_PID $FRONTEND_PID

