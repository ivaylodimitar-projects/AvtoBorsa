#!/usr/bin/env bash
set -o errexit

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8000}"

exec daphne -b "$HOST" -p "$PORT" backend.asgi:application
