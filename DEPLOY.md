# Bottleneck Deployment Guide

## Railway Deployment
1. Create new Railway app
2. Connect to your GitHub repository
3. Set environment variables from .env.example
4. Deploy

## Slack App Setup
1. Create app at https://api.slack.com/apps
2. Add scopes: `commands`, `chat:write`, `chat:write.public`
3. Enable Socket Mode
4. Set `SLACK_APP_TOKEN` from App Credentials
5. Install app to workspace

## Environment Variables
- SLACK_BOT_TOKEN: Bot user OAuth token
- SLACK_SIGNING_SECRET: Verification token
- SLACK_APP_TOKEN: Socket Mode token
- DATABASE_PATH: Path to SQLite database

## Local Testing
1. Run `npm install`
2. Start dev server: `npm run dev`
3. Use ngrok: `ngrok http 3000` then set Slack request URL to ngrok URL