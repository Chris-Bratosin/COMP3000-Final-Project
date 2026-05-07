#!/bin/sh
set -eu

if [ ! -f node_modules/express/package.json ] \
  || [ ! -f node_modules/@aws-sdk/client-s3/package.json ] \
  || [ ! -f node_modules/@aws-sdk/client-iam/package.json ]; then
  npm install
fi

node server.js
