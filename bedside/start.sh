#!/bin/sh
# Starts the bedside translation service on http://127.0.0.1:8020
# Uses bedside/.venv if present (see README), otherwise the older ../ai-lab/.venv.
cd "$(dirname "$0")" || exit 1
if [ -x .venv/bin/uvicorn ]; then UV=.venv/bin/uvicorn; else UV=../ai-lab/.venv/bin/uvicorn; fi
exec "$UV" server:app --host 127.0.0.1 --port 8020
