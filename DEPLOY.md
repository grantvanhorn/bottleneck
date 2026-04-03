# Deployment Guide for Bottleneck

## 1. Prerequisites
- Node.js 20.x installed (check with `node -v`)
- Slack API token (create a Slack app and get bot token)
- Railway account (https://railway.app)
- Docker installed (for local testing)

## 2. Slack App Setup
1. Go to https://api.slack.com/apps
2. Create new app > Choose "From scratch"
3. Under "OAuth & Permissions":
   - Enable "Bot Token"
   - Add scope: `commands`, `chat:write`, `users:read`
4. Install app to workspace
5. Note the Bot Token (starts with xoxb-)

## 3. Local Development
```bash
# Clone repo
git clone <your-repo-url>

cd bottleneck

# Install dependencies
npm install

# Copy and configure env file
cp .env.example .env
# Edit .env with your Slack token and settings

# Run app
npm start
```

## 4. Railway Deployment
1. Connect repo:
   - `railway login`
   - `railway link`
   - Select your repo

2. Add volume:
   - In Railway dashboard, add new volume named `bottleneck-data`
   - Set mount path to `/data`

3. Set environment variables:
   - SLACK_BOT_TOKEN=your-xoxb-token-here
   - DATABASE_URL=/data/bottleneck.db
   - PORT=3000
   - LOG_LEVEL=info
   - MAX_TASKS_PER_USER=50

4. Deploy:
   - `railway deploy`
   - Wait for container to start

5. Verify:
   - Check Railway logs for startup output
   - Test with Slack command `/bottleneck help`