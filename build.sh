#!/bin/bash

# Log build environment
echo "NODE_ENV: $NODE_ENV"
echo "VERCEL: $VERCEL"
echo "VERCEL_ENV: $VERCEL_ENV"

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the client
echo "Building client..."
npm run build

# Log success
echo "Build completed successfully!" 