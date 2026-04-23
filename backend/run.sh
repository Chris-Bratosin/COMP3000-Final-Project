#!/bin/sh
set -eu

if [ ! -f node_modules/express/package.json ] || [ ! -f node_modules/mongoose/package.json ]; then
  if [ -f package-lock.json ]; then
    npm install
  else
    npm install
  fi
fi

node server.js
