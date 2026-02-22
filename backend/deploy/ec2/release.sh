#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/var/www/AvtoBorsa}"
VENV_PATH="${VENV_PATH:-$PROJECT_ROOT/venv}"
PYTHON_BIN="${PYTHON_BIN:-python3}"

cd "$PROJECT_ROOT/backend"

if [ ! -d "$VENV_PATH" ]; then
  "$PYTHON_BIN" -m venv "$VENV_PATH"
fi

source "$VENV_PATH/bin/activate"
pip install --upgrade pip
pip install -r requirements.txt

python manage.py migrate --noinput
python manage.py collectstatic --noinput

sudo systemctl daemon-reload
sudo systemctl restart karbg-backend
sudo systemctl reload nginx
