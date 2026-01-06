#!/bin/bash

# GPS Vehicle Monitoring Platform - Production Deployment Script
# Usage: ./deploy.sh [start|stop|restart|status]

APP_NAME="xdwTTXsp"
APP_DIR="/home/shenzheng/xdwTTXsp"
BACKEND_PORT=8081
FRONTEND_PORT=8080
JT808_PORT=8808
JT1078_PORT=1078

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if a port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
    return $?
}

# Stop all services
stop_services() {
    log_info "Stopping services..."

    # Stop backend
    if check_port $BACKEND_PORT; then
        pkill -f "node.*dist/app.js" 2>/dev/null
        pkill -f "serve.*frontend/dist" 2>/dev/null
        sleep 2
        log_info "Services stopped"
    else
        log_info "Services not running"
    fi
}

# Start backend service
start_backend() {
    log_info "Starting backend server on port $BACKEND_PORT..."

    cd "$APP_DIR/backend"

    # Check if dist exists
    if [ ! -d "dist" ]; then
        log_warn "Backend not built, building now..."
        npm run build
    fi

    # Start backend
    NODE_ENV=production nohup node dist/app.js > /tmp/xdwTTXsp-backend.log 2>&1 &

    sleep 3

    if check_port $BACKEND_PORT; then
        log_info "Backend started successfully (PID: $(lsof -t -i:$BACKEND_PORT))"
        log_info "  - API Server: http://0.0.0.0:$BACKEND_PORT"
        log_info "  - JT808 Server: port $JT808_PORT"
        log_info "  - JT1078 Server: port $JT1078_PORT"
    else
        log_error "Backend failed to start. Check /tmp/xdwTTXsp-backend.log"
        return 1
    fi
}

# Start frontend server
start_frontend() {
    log_info "Starting frontend server on port $FRONTEND_PORT..."

    cd "$APP_DIR/frontend"

    # Check if dist exists
    if [ ! -d "dist" ]; then
        log_warn "Frontend not built, building now..."
        npm run build
    fi

    # Use 'serve' or 'npx serve' to serve static files
    if command -v serve &> /dev/null; then
        nohup serve -s dist -l $FRONTEND_PORT > /tmp/xdwTTXsp-frontend.log 2>&1 &
    else
        nohup npx serve -s dist -l $FRONTEND_PORT > /tmp/xdwTTXsp-frontend.log 2>&1 &
    fi

    sleep 3

    if check_port $FRONTEND_PORT; then
        log_info "Frontend started successfully (PID: $(lsof -t -i:$FRONTEND_PORT))"
        log_info "  - Web UI: http://0.0.0.0:$FRONTEND_PORT"
    else
        log_error "Frontend failed to start. Check /tmp/xdwTTXsp-frontend.log"
        return 1
    fi
}

# Show status
show_status() {
    echo ""
    echo "=========================================="
    echo "  $APP_NAME Service Status"
    echo "=========================================="
    echo ""

    if check_port $BACKEND_PORT; then
        echo -e "Backend (port $BACKEND_PORT):    ${GREEN}RUNNING${NC}"
    else
        echo -e "Backend (port $BACKEND_PORT):    ${RED}STOPPED${NC}"
    fi

    if check_port $FRONTEND_PORT; then
        echo -e "Frontend (port $FRONTEND_PORT):   ${GREEN}RUNNING${NC}"
    else
        echo -e "Frontend (port $FRONTEND_PORT):   ${RED}STOPPED${NC}"
    fi

    if check_port $JT808_PORT; then
        echo -e "JT808 (port $JT808_PORT):        ${GREEN}RUNNING${NC}"
    else
        echo -e "JT808 (port $JT808_PORT):        ${RED}STOPPED${NC}"
    fi

    if check_port $JT1078_PORT; then
        echo -e "JT1078 (port $JT1078_PORT):        ${GREEN}RUNNING${NC}"
    else
        echo -e "JT1078 (port $JT1078_PORT):        ${RED}STOPPED${NC}"
    fi

    echo ""
    echo "URLs:"
    echo "  - Web UI:     http://$(hostname -I | awk '{print $1}'):$FRONTEND_PORT"
    echo "  - API:        http://$(hostname -I | awk '{print $1}'):$BACKEND_PORT"
    echo ""
}

# Main
case "$1" in
    start)
        stop_services
        start_backend
        start_frontend
        show_status
        ;;
    stop)
        stop_services
        show_status
        ;;
    restart)
        stop_services
        sleep 2
        start_backend
        start_frontend
        show_status
        ;;
    status)
        show_status
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac

exit 0
