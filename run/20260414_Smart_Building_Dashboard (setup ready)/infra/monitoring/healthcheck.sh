#!/usr/bin/env bash
# =============================================================================
# Smart Building Dashboard — Health Check Script
# Checks all services and reports status
# Usage: ./healthcheck.sh [BASE_URL]
# =============================================================================

set -euo pipefail

BASE_URL="${1:-http://localhost}"
BACKEND_URL="${BACKEND_URL:-http://localhost:5000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5001}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5500}"
POSTGRES_USER="${POSTGRES_USER:-sbd_user}"
POSTGRES_DB="${POSTGRES_DB:-smart_building}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-5600}"
MQTT_HOST="${MQTT_HOST:-localhost}"
MQTT_PORT="${MQTT_PORT:-5700}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

check_service() {
    local name="$1"
    local status="$2"
    local detail="${3:-}"

    if [ "$status" = "ok" ]; then
        echo -e "  ${GREEN}✓${NC} ${name} ${detail}"
        PASS=$((PASS + 1))
    elif [ "$status" = "warn" ]; then
        echo -e "  ${YELLOW}⚠${NC} ${name} ${detail}"
        WARN=$((WARN + 1))
    else
        echo -e "  ${RED}✗${NC} ${name} ${detail}"
        FAIL=$((FAIL + 1))
    fi
}

echo "============================================="
echo " Smart Building Dashboard — Health Check"
echo " $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "============================================="
echo ""

# --- Backend API ---
echo "Backend API (${BACKEND_URL}):"
if response=$(curl -sf -o /dev/null -w "%{http_code}" "${BACKEND_URL}/api/v1/health" 2>/dev/null); then
    if [ "$response" = "200" ]; then
        health_data=$(curl -sf "${BACKEND_URL}/api/v1/health" 2>/dev/null)
        uptime=$(echo "$health_data" | grep -o '"uptime":[0-9.]*' | cut -d: -f2 || echo "unknown")
        check_service "Health endpoint" "ok" "(HTTP ${response}, uptime: ${uptime}s)"
    else
        check_service "Health endpoint" "fail" "(HTTP ${response})"
    fi
else
    check_service "Health endpoint" "fail" "(unreachable)"
fi
echo ""

# --- Frontend ---
echo "Frontend (${FRONTEND_URL}):"
if response=$(curl -sf -o /dev/null -w "%{http_code}" "${FRONTEND_URL}" 2>/dev/null); then
    if [ "$response" = "200" ]; then
        check_service "Web interface" "ok" "(HTTP ${response})"
    else
        check_service "Web interface" "warn" "(HTTP ${response})"
    fi
else
    check_service "Web interface" "fail" "(unreachable)"
fi
echo ""

# --- PostgreSQL ---
echo "PostgreSQL (${POSTGRES_HOST}:${POSTGRES_PORT}):"
if command -v pg_isready &> /dev/null; then
    if pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" > /dev/null 2>&1; then
        check_service "Connection" "ok" "(accepting connections)"
    else
        check_service "Connection" "fail" "(not ready)"
    fi
elif command -v docker &> /dev/null; then
    if docker exec sbd-postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" > /dev/null 2>&1; then
        check_service "Connection" "ok" "(via docker)"
    else
        check_service "Connection" "fail" "(not ready)"
    fi
else
    if nc -z "$POSTGRES_HOST" "$POSTGRES_PORT" 2>/dev/null; then
        check_service "Connection" "ok" "(port open)"
    else
        check_service "Connection" "fail" "(port closed)"
    fi
fi
echo ""

# --- Redis ---
echo "Redis (${REDIS_HOST}:${REDIS_PORT}):"
if command -v redis-cli &> /dev/null; then
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>/dev/null | grep -q "PONG"; then
        check_service "Connection" "ok" "(PONG)"
    else
        check_service "Connection" "fail" "(no response)"
    fi
elif command -v docker &> /dev/null; then
    if docker exec sbd-redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
        check_service "Connection" "ok" "(via docker)"
    else
        check_service "Connection" "fail" "(no response)"
    fi
else
    if nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; then
        check_service "Connection" "ok" "(port open)"
    else
        check_service "Connection" "fail" "(port closed)"
    fi
fi
echo ""

# --- MQTT Broker ---
echo "Mosquitto MQTT (${MQTT_HOST}:${MQTT_PORT}):"
if command -v mosquitto_sub &> /dev/null; then
    if timeout 3 mosquitto_sub -h "$MQTT_HOST" -p "$MQTT_PORT" -t '$SYS/#' -C 1 -W 2 > /dev/null 2>&1; then
        check_service "Connection" "ok" "(broker responding)"
    else
        check_service "Connection" "fail" "(no response)"
    fi
else
    if nc -z "$MQTT_HOST" "$MQTT_PORT" 2>/dev/null; then
        check_service "Connection" "ok" "(port open)"
    else
        check_service "Connection" "fail" "(port closed)"
    fi
fi
echo ""

# --- Docker Containers (if docker available) ---
if command -v docker &> /dev/null; then
    echo "Docker Containers:"
    for container in sbd-postgres sbd-redis sbd-mosquitto sbd-backend sbd-frontend; do
        if docker ps --filter "name=${container}" --format "{{.Status}}" 2>/dev/null | grep -q "Up"; then
            status=$(docker ps --filter "name=${container}" --format "{{.Status}}" 2>/dev/null)
            if echo "$status" | grep -q "healthy"; then
                check_service "$container" "ok" "(${status})"
            elif echo "$status" | grep -q "unhealthy"; then
                check_service "$container" "fail" "(${status})"
            else
                check_service "$container" "warn" "(${status})"
            fi
        else
            check_service "$container" "fail" "(not running)"
        fi
    done
    echo ""
fi

# --- Summary ---
echo "============================================="
TOTAL=$((PASS + FAIL + WARN))
echo -e " Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}, ${YELLOW}${WARN} warnings${NC} (${TOTAL} total)"
echo "============================================="

if [ "$FAIL" -gt 0 ]; then
    exit 1
elif [ "$WARN" -gt 0 ]; then
    exit 0
else
    exit 0
fi
