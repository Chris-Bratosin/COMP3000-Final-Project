#!/bin/sh
set -eu

if [ ! -x node_modules/.bin/next ]; then
  if [ -f package-lock.json ]; then
    npm ci
  else
    npm install
  fi
fi

npm run dev -- --hostname 0.0.0.0 --port 3000
