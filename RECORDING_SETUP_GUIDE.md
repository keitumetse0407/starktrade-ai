# DEMO VIDEO RECORDING SETUP GUIDE
## For StarkTrade AI 90-Second Demo

## SYSTEM CHECK
✅ FFmpeg available for screen recording and video processing
✅ Python environment available
✅ StarkTrade AI deployed at starktrade-ai.vercel.app
✅ Backend running on VPS: 185.167.97.193:8000

## AUDIO RECORDING OPTIONS

### Option 1: Use Built-in TTS (Fastest)
```bash
# Install espeak for TTS
sudo apt update && sudo apt install -y espeak

# Generate voiceover from script
espeak -v en+f3 -s 150 -w opening_hook.wav "What if you could predict market moves before they happen?"
espeak -v en+f3 -s 150 -w global_view.wav "StarkTrade AI monitors 50,000+ global assets simultaneously"
espeak -v en+f3 -s 150 -w voice_trading.wav "Buy one Bitcoin at market price. Executed in 40 milliseconds"
espeak -v en+f3 -s 150 -w ai_prediction.wav "Our AI predicted this 12% move three hours before it happened. Accuracy percentage: 89%"
espeak -v en+f3 -s 150 -w interface.wav "Designed for both retail traders and institutional quant teams"
espeak -v en+f3 -s 150 -w results_cta.wav "Join the waitlist now at starktrade-ai.vercel.app. StarkTrade AI - The future of trading is now"

# Combine audio files
ffmpeg -f concat -safe 0 -i <(for f in *.wav; do echo "file '$PWD/$f'"; done) -c copy full_voiceover.wav
```

### Option 2: Record Your Own Voice (Best Quality)
```bash
# Check if you have a microphone
arecord -l

# Record voiceover sections
arecord -D plughw:0,0 -f S16_LE -r 44100 opening_hook.wav
# Speak: "What if you could predict market moves before they happen?"
# (Repeat for each section)
```

## SCREEN RECORDING SETUP

### Record Frontend Demo
```bash
# Record 3D globe view (10 seconds)
ffmpeg -video_size 1920x1080 -framerate 30 -f x11grab -i :0.0+0,0 -t 10 globe_demo.mp4

# Record voice command trading (10 seconds)
ffmpeg -video_size 1920x1080 -framerate 30 -f x11grab -i :0.0+0,0 -t 10 voice_trading_demo.mp4

# Record AI prediction (15 seconds)
ffmpeg -video_size 1920x1080 -framerate 30 -f x11grab -i :0.0+0,0 -t 15 ai_prediction_demo.mp4

# Record glassmorphic interface (15 seconds)
ffmpeg -video_size 1920x1080 -framerate 30 -f x11grab -i :0.0+0,0 -t 15 interface_demo.mp4
```

### Alternative: Record Specific Browser Window
```bash
# Get window ID of your browser
wmctrl -l | grep -i "starktrade\|chrome\|firefox"

# Record specific window (replace WINDOW_ID)
ffmpeg -video_size 1920x1080 -framerate 30 -f x11grab -i :0.0+WINDOW_X,WINDOW_Y -t 10 demo_segment.mp4
```

## VIDEO EDITING & ASSEMBLY

### Create Title/Logo Animation (Using FFmpeg)
```bash
# Create StarkTrade AI logo text
ffmpeg -f lavfi -i color=c=black:s=1920x1080:d=5 -vf "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='STARKTRADE AI':fontcolor=white:fontsize=100:x=(w-text_w)/2:y=(h-text_h)/2:shadowcolor=black@0.5:shadowx=2:shadowy=2" -t 5 logo_intro.mp4

# Add glow effect (simplified)
ffmpeg -i logo_intro.mp4 -vf "glow=g=2" logo_intro_glow.mp4
```

### Assemble Final Video
```bash
# Create concat file list
echo "file 'logo_intro_glow.mp4'" > concat_list.txt
echo "file 'globe_demo.mp4'" >> concat_list.txt
echo "file 'voice_trading_demo.mp4'" >> concat_list.txt
echo "file 'ai_prediction_demo.mp4'" >> concat_list.txt
echo "file 'interface_demo.mp4'" >> concat_list.txt
echo "file 'results_cta_demo.mp4'" >> concat_list.txt

# Concatenate videos
ffmpeg -f concat -safe 0 -i concat_list.txt -c copy final_video.mp4

# Add voiceover
ffmpeg -i final_video.mp4 -i full_voiceover.wav -c:v copy -c:a aac -shortest starktrade_ai_demo_final.mp4
```

## QUICK ACTION PLAN

### Phase 1: Preparation (15 minutes)
1. [ ] Install espeak: `sudo apt install -y espeak`
2. [ ] Open StarkTrade AI in browser: `starktrade-ai.vercel.app`
3. [ ] Prepare demo data/scenarios in the UI

### Phase 2: Recording (30 minutes)
1. [ ] Record voiceover sections using TTS or your voice
2. [ ] Record each screen segment (globe, voice trading, AI prediction, interface)
3. [ ] Record results/CTA section

### Phase 3: Assembly (15 minutes)
1. [ ] Combine audio files
2. [ ] Combine video segments
3. [ ] Overlay audio on video
4. [ ] Add title/logo animation

### Phase 4: Distribution (Ready to use)
- Upload to YouTube Shorts/TikTok
- Share on LinkedIn/Twitter/X
- Embed in cold emails
- Feature on landing page

## ESTIMATED TIME: 60-90 minutes total
## OUTPUT: starktrade_ai_demo_final.mp4 (90 seconds)

Would you like me to:
1. Execute any of these commands to start the recording process?
2. Create a simplified one-click recording script?
3. Help you set up the specific demo scenarios in the StarkTrade AI UI first?
4. Proceed with writing the cold emails while you record?