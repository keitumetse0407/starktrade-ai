#!/bin/bash
cd /var/www/starktrade-ai/frontend/src/app/landing
echo "// Force rebuild $(date)" >> page.tsx
cd /var/www/starktrade-ai
git add .
git commit -m "🩸 Force Vercel rebuild - $(date +%s)

Co-authored-by: Qwen-Coder <qwen-coder@alibabacloud.com>"
git push origin main
echo "Pushed to GitHub. Vercel will redeploy in 60 seconds."
echo "Monitor: https://vercel.com/keitumetse0407s-projects/starktrade-ai/deployments"
sleep 60
curl -s https://starktrade-ai.vercel.app/landing | head -50
