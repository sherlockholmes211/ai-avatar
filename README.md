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
| 🖱️ Smart Click-Through | Clicks pass through to desktop except over the avatar |
| ✋ Drag & Drop | Grab and move the avatar freely |
| 🎨 Customization | Right-click to change theme, face, and size |
| 💬 Speech Bubbles | Typewriter effect with auto-positioning |
| ✨ Particle Effects | Sparkles and emojis on interactions |
| 😴 Idle Behaviors | Random thoughts and movements |
| 🎉 Double-click | Special party reaction! |
| 💾 Persistence | Settings are saved between restarts |

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
│  ├── IPC Communication & Context Menu                       │
│  └── System Integration (always-on-top, workspaces)         │
├─────────────────────────────────────────────────────────────┤
│  Renderer Process (renderer.js)                             │
│  ├── Smart Click-Through Logic                              │
│  ├── Avatar State Machine & Customization                   │
│  ├── Movement System                                        │
│  ├── Speech Bubble Controller                               │
│  └── Event Handlers                                         │
├─────────────────────────────────────────────────────────────┤
│  UI Layer (index.html + styles.css)                         │
│  ├── Avatar Container (CSS Variables)                       │
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
  skipTaskbar: true,      // Hidden from taskbar
  focusable: false        // Don't steal focus from other apps
});
```

**Features:**
- Creates a fullscreen transparent overlay.
- Handles IPC for dynamic click-through toggling.
- Manages the **Right-click Context Menu** for customization.
- macOS-specific: visible on all workspaces.

---

### `renderer.js` - Avatar Logic

The renderer manages all avatar behavior and interactions.

#### Smart Click-Through

The app uses a dynamic click-through system:
- **Default**: The entire window ignores mouse events, letting you interact with apps behind the avatar.
- **Hover**: When the mouse enters the avatar or speech bubble area, the window captures mouse events for dragging or clicking.

#### Core Functions

| Function | Description |
|----------|-------------|
| `enableClickThrough()` | Makes the window transparent to clicks |
| `enableClickCapture()` | Makes the window capture clicks (over avatar) |
| `setTheme(themeName)` | Updates avatar colors via CSS variables |
| `setFace(face)` | Updates the avatar's face expression |
| `setSize(size)` | Scales the avatar up or down |
| `showSpeechBubble()` | Display speech with typewriter effect |

---

### `styles.css` - Visual Design

#### CSS Variables

The app uses variables for easy customization:
- `--avatar-size`: Scaling factor
- `--avatar-primary`: Primary body color
- `--avatar-secondary`: Gradient secondary color
- `--avatar-accent`: Gradient accent color

#### Animation States

| Class | Effect |
|-------|--------|
| `.idle` | Gentle floating animation |
| `.walking` | Bounce/squash animation |
| `.sleeping` | Tilted with closed eyes |
| `.excited` | Rapid bouncing with star eyes |

---

## 🎮 Usage Guide

### Basic Interactions

| Action | Result |
|--------|--------|
| **Right-Click** avatar | Open customization menu |
| **Drag** the avatar | Move it freely |
| **Double-click** avatar | Party mode with particles! |
| **Wait** 8+ seconds | Random idle behavior |

### 🎨 Customization Options

By right-clicking the avatar, you can access:
- **Themes**: Original Pink, Cool Blue, Deep Purple, Neon Green, Sunlight Yellow.
- **Expressions**: Happy, Dot, Kawaii, Star, Zen.
- **Size**: Tiny, Small, Standard, Large, Giant.

---

## 🛠️ Development

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
| `show-avatar-menu` | Renderer → Main | Trigger context menu |
| `change-theme` | Main → Renderer | Apply selected color theme |
| `change-face` | Main → Renderer | Apply selected expression |
| `change-size` | Main → Renderer | Apply selected size scale |

---

## 🚧 Roadmap

- [ ] Voice interaction (speech recognition)
- [ ] AI responses (GPT/Gemini integration)
- [ ] Desktop icon interaction
- [ ] Multiple avatar skins
- [ ] Settings panel

---

## 📜 License

MIT License - Feel free to use and modify!

---

Made with 💖 by Vishnu Teja
