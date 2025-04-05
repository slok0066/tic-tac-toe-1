#!/bin/bash

# Create a new directory for the server-only code
mkdir -p ../tic-tac-toe-server

# Copy files with UTF-8 encoding
cat index-clean.js > ../tic-tac-toe-server/index.js
cat package.json > ../tic-tac-toe-server/package.json
cat railway.json > ../tic-tac-toe-server/railway.json
cat README.md > ../tic-tac-toe-server/README.md
cat .gitignore > ../tic-tac-toe-server/.gitignore

# Navigate to the new directory
cd ../tic-tac-toe-server

# Initialize git repository
git init
git add .
git commit -m "Initial server setup with proper encoding"
git branch -M main

echo "Server files prepared in ../tic-tac-toe-server"
echo "Next steps:"
echo "1. Create a new GitHub repository"
echo "2. Connect the local repo with: git remote add origin YOUR_REPO_URL"
echo "3. Push with: git push -u origin main"
echo "4. Deploy on Railway from the GitHub repository" 