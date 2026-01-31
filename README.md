# 🌟 AI Avatar - Desktop Companion

A cute, interactive AI avatar that lives on your desktop! Built with Electron and JavaScript, this adorable companion can travel around your screen, respond to clicks, and express itself through speech bubbles.

![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)
![Electron](https://img.shields.io/badge/electron-28.0.0-green)
![License](https://img.shields.io/badge/license-MIT-purple)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🪟 Transparent Window | Avatar floats above your desktop |
| 🏃 Click to Move | Click anywhere, avatar walks there |
| ✋ Drag & Drop | Grab and move the avatar freely |
| 💬 Speech Bubbles | Typewriter effect with auto-positioning |
| ✨ Particle Effects | Sparkles and emojis on interactions |
| 😴 Idle Behaviors | Random thoughts and movements |
| 🎉 Double-click | Special party reaction! |

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run the app
npm start
```

---

## 📁 Project Structure

```
ai-avatar/
├── package.json          # Project config & dependencies
└── src/
    ├── main.js          # Electron main process
    ├── renderer.js      # Avatar logic & interactions
    ├── index.html       # HTML structure
    └── styles.css       # Styling & animations
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Application                      │
├─────────────────────────────────────────────────────────────┤
│  Main Process (main.js)                                     │
│  ├── Window Management (transparent, frameless)             │
│  ├── IPC Communication                                      │
│  └── System Integration (always-on-top, workspaces)         │
├─────────────────────────────────────────────────────────────┤
│  Renderer Process (renderer.js)                             │
│  ├── Avatar State Machine                                   │
│  ├── Movement System                                        │
│  ├── Speech Bubble Controller                               │
│  ├── Particle System                                        │
│  └── Event Handlers                                         │
├─────────────────────────────────────────────────────────────┤
│  UI Layer (index.html + styles.css)                         │
│  ├── Avatar Container & Styling                             │
│  ├── Speech Bubble Components                               │
│  └── CSS Animations                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📄 File Documentation

### `main.js` - Electron Main Process

The main process handles window creation and system-level features.

**Key Configuration:**

```javascript
new BrowserWindow({
  transparent: true,      // See-through window
  frame: false,           // No title bar
  alwaysOnTop: true,      // Always visible
  hasShadow: false,       // No shadow
  skipTaskbar: true       // Hidden from taskbar
});
```

**Features:**
- Creates a fullscreen transparent overlay
- Handles IPC for mouse event forwarding
- macOS-specific: visible on all workspaces
- Responds to display size changes

---

### `renderer.js` - Avatar Logic

The renderer manages all avatar behavior and interactions.

#### State Management

```javascript
const state = {
  x, y,              // Current position
  targetX, targetY,  // Movement destination
  isMoving,          // Animation state
  isDragging,        // Drag state
  emotion,           // Current mood
  speed,             // Movement speed
  direction          // Facing direction
};
```

#### Core Functions

| Function | Description |
|----------|-------------|
| `initAvatar()` | Initialize position and show welcome message |
| `moveTowardsTarget()` | Smooth movement towards click position |
| `showSpeechBubble(text, mood, duration)` | Display speech with typewriter effect |
| `typewriterEffect(text)` | Character-by-character text animation |
| `createParticle(x, y, emoji)` | Spawn floating emoji particle |
| `randomIdleBehavior()` | Trigger random thoughts/movements |

#### Event Flow

```
User Click → Calculate Target → Start Walking Animation
    ↓
Movement Loop (requestAnimationFrame)
    ↓
Arrive at Target → Switch to Idle → Show Message
```

---

### `styles.css` - Visual Design

#### Avatar Styling

The avatar uses CSS pseudo-elements for a cute isometric look:

```css
.avatar::before {
  /* Body - gradient pink cube */
  background: linear-gradient(135deg, #FFB7C5, #FF6B8A);
  transform: rotateX(15deg) rotateY(-15deg);
}

.avatar::after {
  /* Face - cute emoji */
  content: '◕‿◕';
}
```

#### Animation States

| Class | Effect |
|-------|--------|
| `.idle` | Gentle floating animation |
| `.walking` | Bounce/squash animation |
| `.sleeping` | Tilted with closed eyes |
| `.excited` | Rapid bouncing with star eyes |

#### Speech Bubble Variants

| Class | Style |
|-------|-------|
| `.speech-bubble` | Default white gradient |
| `.thinking` | Blue gradient |
| `.excited` | Yellow gradient + bounce |

---

## 🎮 Usage Guide

### Basic Interactions

| Action | Result |
|--------|--------|
| **Click** anywhere | Avatar walks to that spot |
| **Drag** the avatar | Move it freely |
| **Double-click** avatar | Party mode with particles! |
| **Wait** 8+ seconds | Random idle behavior |

### Avatar Emotions

The avatar has multiple emotional states:

- **Idle** ◕‿◕ - Default happy state, gentle floating
- **Walking** ◕‿◕ - Moving to destination
- **Excited** ★‿★ - After interactions
- **Sleeping** −‿− - When resting (future feature)

---

## 🔧 Customization

### Change Avatar Appearance

Edit `styles.css`:

```css
/* Change colors */
.avatar::before {
  background: linear-gradient(135deg, #YOUR_COLOR1, #YOUR_COLOR2);
}

/* Change face */
.avatar::after {
  content: '●‿●';  /* Try different emoji faces */
}
```

### Modify Speed

Edit `renderer.js`:

```javascript
const state = {
  // ...
  speed: 3,  // Increase for faster movement
};
```

### Add Custom Messages

Edit the message arrays in `renderer.js`:

```javascript
const messages = [
  "Your custom message! 🌟",
  "Another message! ✨"
];
```

---

## 🛠️ Development

### Enable DevTools

Uncomment in `main.js`:

```javascript
mainWindow.webContents.openDevTools({ mode: 'detach' });
```

### Debug Mode

Run with logging:

```bash
npm run dev
```

---

## 📝 API Reference

### IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `set-ignore-mouse-events` | Renderer → Main | Toggle click-through |

### Speech Bubble API

```javascript
showSpeechBubble(
  text,              // String: message to display
  mood,              // 'normal' | 'thinking' | 'excited'
  duration           // Number: ms before auto-hide (0 = permanent)
);
```

### Particle API

```javascript
createParticle(
  x,                 // Number: x position
  y,                 // Number: y position  
  emoji              // String: emoji to display
);
```

---

## 🚧 Roadmap

- [ ] Voice interaction (speech recognition)
- [ ] AI responses (GPT/Gemini integration)
- [ ] Desktop icon interaction
- [ ] Multiple avatar skins
- [ ] Settings panel
- [ ] System tray icon

---

## 📜 License

MIT License - Feel free to use and modify!

---

Made with 💖 by Vishnu Teja
