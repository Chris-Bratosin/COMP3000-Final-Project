#!/bin/sh
set -eu

if [ ! -f node_modules/express/package.json ] \
  || [ ! -f node_modules/@aws-sdk/client-s3/package.json ] \
  || [ ! -f node_modules/@aws-sdk/client-iam/package.json ] \
  || [ ! -f node_modules/@aws-sdk/client-ec2/package.json ] \
  || [ ! -f node_modules/@aws-sdk/client-secrets-manager/package.json ]; then
  npm install
fi

node server.js
