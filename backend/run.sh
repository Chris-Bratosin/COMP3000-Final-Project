#!/bin/sh
set -eu

if [ ! -f node_modules/express/package.json ]; then
  if [ -f package-lock.json ]; then
    npm ci
  else
    npm install
  fi
fi

node server.js
