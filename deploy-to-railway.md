# Railway Deployment Guide

Since Railway seems to have issues with the current project structure and encoding, the best approach is to deploy just the server directory as a separate repository.

## Steps to Deploy Server to Railway

1. Create a new GitHub repository for just the server code.

2. In your local environment:

```bash
# Create a new directory
mkdir tic-tac-toe-server
cd tic-tac-toe-server

# Copy server files
cp -r /path/to/tic-tac-toe/server/index-clean.js index.js
cp -r /path/to/tic-tac-toe/server/package.json .
cp -r /path/to/tic-tac-toe/server/railway.json .
cp -r /path/to/tic-tac-toe/server/README.md .
cp -r /path/to/tic-tac-toe/server/.gitignore .

# Initialize git repository
git init
git add .
git commit -m "Initial server setup"
git branch -M main
git remote add origin https://github.com/your-username/tic-tac-toe-server.git
git push -u origin main
```

3. Go to [Railway](https://railway.app) and create a new project:
   - Click "New Project"
   - Choose "Deploy from GitHub repo"
   - Select your `tic-tac-toe-server` repository
   - Deploy - Railway will automatically detect and deploy the Node.js app

4. After deployment, make note of your Railway app URL (e.g., https://tic-tac-toe-server-production.up.railway.app)

5. Update the `src/utils/socket.ts` file in your main project to point to this URL:

```typescript
serverUrl = "https://your-app-url.railway.app";
```

6. Deploy your frontend to Vercel as originally planned.

## Troubleshooting

If you still see encoding issues, try creating the server files from scratch in a new directory with a text editor that ensures UTF-8 encoding. 