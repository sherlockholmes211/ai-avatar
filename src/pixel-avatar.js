// pixel-avatar.js — Hand-crafted pixel art avatar with emotes
// All art drawn with PIXI.Graphics. No upload needed.

class PixelAvatar {
    constructor(app) {
        this.app = app;
        this.PX = 5; // 1 game-pixel = 5 screen pixels

        this.container = new PIXI.Container();
        this.app.stage.addChild(this.container);

        // Fixed top-right position
        this.baseX = window.innerWidth - 150;
        this.baseY = 200;
        this.container.x = this.baseX;
        this.container.y = this.baseY;

        this.currentEmote = 'idle';
        this._emoteTick = null;
        this._emoteTimer = null;

        // Build layers
        this.bodyGfx = new PIXI.Graphics();
        this.faceGfx = new PIXI.Graphics();
        this.container.addChild(this.bodyGfx);
        this.container.addChild(this.faceGfx);

        this._drawBody();
        this._drawFace('idle');

        // Emote label
        this._buildLabel();

        window.addEventListener('resize', () => this.updatePosition());
    }

    // ─── Pixel helper ─────────────────────────────────────────────────────────
    _p(g, x, y, w, h, color) {
        const S = this.PX;
        g.rect(x * S, y * S, w * S, h * S).fill(color);
    }

    // ─── Static Body ──────────────────────────────────────────────────────────
    _drawBody() {
        const g = this.bodyGfx;
        g.clear();
        const p = (x, y, w, h, c) => this._p(g, x, y, w, h, c);

        // Palette
        const OL = '#0d0520'; // outline
        const H1 = '#2d0a4e'; // dark hair root
        const H2 = '#7c3aed'; // hair purple
        const H3 = '#a78bfa'; // hair shine
        const SK = '#ffd4b8'; // skin
        const BL = '#ffb3c1'; // blush
        const BD = '#4338ca'; // hoodie body
        const BS = '#312eb0'; // hoodie shadow
        const BH = '#818cf8'; // hoodie highlight
        const PT = '#1e1b5e'; // pants
        const SH = '#0f0d3a'; // shoes
        const NC = '#ede9fe'; // neck/collar

        // ── HAIR ──
        p(4, 0, 12, 1, OL);         // top outline
        p(4, 1, 12, 1, H1);         // dark root
        p(4, 2, 12, 4, H2);         // main hair
        p(6, 2, 4, 2, H3);          // shine
        p(3, 1, 1, 13, OL);         // left outline
        p(16, 1, 1, 13, OL);        // right outline
        // side hair flaps
        p(3, 5, 2, 6, H2);
        p(15, 5, 2, 6, H2);
        p(3, 11, 2, 2, H1);
        p(15, 11, 2, 2, H1);

        // ── FACE ──
        p(4, 5, 12, 9, SK);         // skin base

        // ── NECK ──
        p(8, 14, 4, 2, SK);
        p(7, 15, 6, 1, NC);

        // ── HOODIE BODY ──
        p(2, 16, 16, 1, OL);        // hoodie top line
        p(2, 17, 16, 9, BD);        // body
        p(2, 17, 2, 9, BS);         // left shadow
        p(16, 17, 2, 9, BS);        // right shadow
        p(3, 18, 3, 3, BH);         // left shine
        p(14, 18, 3, 3, BH);        // right shine
        // pocket
        p(8, 22, 4, 3, BS);
        p(9, 23, 2, 2, BD);
        // hoodie bottom
        p(2, 26, 16, 1, OL);

        // ── ARMS ──
        p(0, 17, 2, 7, BD);
        p(0, 17, 2, 7, BS);
        p(18, 17, 2, 7, BD);
        p(18, 17, 2, 7, BS);
        // hands
        p(0, 24, 2, 2, SK);
        p(18, 24, 2, 2, SK);

        // ── PANTS / LEGS ──
        p(4, 27, 5, 6, PT);
        p(11, 27, 5, 6, PT);
        p(4, 27, 1, 6, '#13103a');
        p(15, 27, 1, 6, '#13103a');

        // ── SHOES ──
        p(3, 33, 7, 2, SH);
        p(10, 33, 7, 2, SH);
        p(3, 34, 7, 1, '#2a278a');
        p(10, 34, 7, 1, '#2a278a');

        // ── OUTLINE BODY ──
        p(2, 16, 1, 11, OL);
        p(19, 16, 1, 11, OL);
        p(3, 27, 1, 8, OL);
        p(9, 27, 1, 8, OL);
        p(10, 27, 1, 8, OL);
        p(16, 27, 1, 8, OL);
    }

    // ─── Expressive Face ──────────────────────────────────────────────────────
    _drawFace(expr) {
        const g = this.faceGfx;
        g.clear();
        const p = (x, y, w, h, c) => this._p(g, x, y, w, h, c);

        const OL = '#0d0520';
        const SK = '#ffd4b8';
        const EW = '#ffffff'; // eye white
        const EP = '#1e0840'; // pupil
        const EI = '#7c3aed'; // iris
        const BL = '#ffb3c1'; // blush
        const MT = '#e0507a'; // mouth
        const TH = '#ffffff'; // teeth

        // ── BLUSH (always) ──
        p(4, 10, 2, 1, BL);
        p(14, 10, 2, 1, BL);

        // ── EYES + MOUTH by expression ──
        switch (expr) {

            case 'idle':
                // Normal eyes
                p(5, 7, 3, 2, EW);
                p(12, 7, 3, 2, EW);
                p(6, 8, 1, 1, EP);   // pupils
                p(13, 8, 1, 1, EP);
                p(5, 7, 1, 1, EI);   // iris rim
                p(12, 7, 1, 1, EI);
                // neutral smile
                p(8, 12, 4, 1, OL);
                p(7, 11, 1, 1, OL);
                p(11, 11, 1, 1, OL);
                break;

            case 'happy':
                // Arc eyes (^_^)
                p(5, 8, 3, 1, OL);
                p(12, 8, 3, 1, OL);
                p(5, 7, 1, 1, OL);
                p(7, 7, 1, 1, OL);
                p(12, 7, 1, 1, OL);
                p(14, 7, 1, 1, OL);
                // big smile
                p(7, 12, 6, 1, OL);
                p(7, 11, 1, 1, OL);
                p(12, 11, 1, 1, OL);
                p(8, 13, 4, 1, TH);
                break;

            case 'excited':
                // Sparkle eyes (stars)
                p(5, 7, 3, 3, EW);
                p(12, 7, 3, 3, EW);
                p(6, 8, 1, 1, EI);
                p(13, 8, 1, 1, EI);
                p(5, 7, 1, 1, EI);
                p(7, 7, 1, 1, EI);
                p(5, 9, 1, 1, EI);
                p(7, 9, 1, 1, EI);
                p(12, 7, 1, 1, EI);
                p(14, 7, 1, 1, EI);
                p(12, 9, 1, 1, EI);
                p(14, 9, 1, 1, EI);
                // O mouth
                p(8, 11, 4, 3, OL);
                p(9, 12, 2, 1, TH);
                // extra blush
                p(4, 9, 2, 2, BL);
                p(14, 9, 2, 2, BL);
                break;

            case 'thinking':
                // One eye squinting
                p(5, 8, 3, 1, OL);
                p(5, 7, 1, 1, OL);
                p(7, 7, 1, 1, OL);
                // Normal other eye
                p(12, 7, 3, 2, EW);
                p(13, 8, 1, 1, EP);
                p(14, 7, 1, 1, EI);
                // flat mouth, slightly off-center
                p(9, 12, 4, 1, OL);
                // thought dots above head
                p(16, 3, 1, 1, OL);
                p(17, 2, 1, 1, OL);
                p(18, 0, 2, 2, OL);
                p(19, 1, 1, 1, EW);
                break;

            case 'speaking':
                // Normal eyes
                p(5, 7, 3, 2, EW);
                p(12, 7, 3, 2, EW);
                p(6, 8, 1, 1, EP);
                p(13, 8, 1, 1, EP);
                // Open mouth (talking)
                p(8, 11, 4, 3, OL);
                p(9, 12, 2, 1, TH);
                p(9, 11, 2, 1, MT);
                break;

            case 'shake': // sad/error
                // Wavy sad eyes
                p(5, 8, 3, 1, OL);
                p(12, 8, 3, 1, OL);
                p(5, 9, 1, 1, OL);
                p(7, 9, 1, 1, OL);
                p(12, 9, 1, 1, OL);
                p(14, 9, 1, 1, OL);
                // sad brow
                p(5, 6, 3, 1, OL);
                p(12, 6, 3, 1, OL);
                p(7, 5, 1, 1, OL);
                p(12, 5, 1, 1, OL);
                // wobbly frown
                p(8, 13, 4, 1, OL);
                p(7, 12, 1, 1, OL);
                p(11, 12, 1, 1, OL);
                break;

            case 'surprised':
                // Wide O eyes
                p(5, 6, 4, 4, EW);
                p(11, 6, 4, 4, EW);
                p(6, 7, 2, 2, EP);
                p(12, 7, 2, 2, EP);
                p(5, 6, 1, 4, OL);
                p(8, 6, 1, 4, OL);
                p(11, 6, 1, 4, OL);
                p(14, 6, 1, 4, OL);
                // O mouth
                p(8, 12, 4, 2, OL);
                p(9, 13, 2, 1, TH);
                break;
        }
    }

    // ─── Emote Label ─────────────────────────────────────────────────────────
    _buildLabel() {
        const el = document.createElement('div');
        el.id = 'emote-label';
        el.style.cssText = `
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(13,5,32,0.75);
            backdrop-filter: blur(10px);
            color: #a78bfa;
            font-family: 'Segoe UI', system-ui, sans-serif;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 2px;
            text-transform: uppercase;
            padding: 5px 18px;
            border-radius: 30px;
            border: 1px solid rgba(124,58,237,0.3);
            opacity: 0;
            transition: opacity 0.3s;
            z-index: 9999;
            pointer-events: none;
        `;
        document.body.appendChild(el);
        this._labelEl = el;
    }

    _showLabel(text) {
        if (!this._labelEl) return;
        this._labelEl.textContent = `✦ ${text} ✦`;
        this._labelEl.style.opacity = '1';
        clearTimeout(this._labelTimer);
        this._labelTimer = setTimeout(() => {
            this._labelEl.style.opacity = '0';
        }, 2000);
    }

    // ─── Emote System ─────────────────────────────────────────────────────────
    _stopCurrentEmote() {
        if (this._emoteTick) {
            this.app.ticker.remove(this._emoteTick);
            this._emoteTick = null;
        }
        if (this._emoteTimer) {
            clearTimeout(this._emoteTimer);
            this._emoteTimer = null;
        }
        // Reset transforms
        this.container.x = this.baseX;
        this.container.y = this.baseY;
        if (this.bodyGfx) {
            this.bodyGfx.scale.set(1);
            this.bodyGfx.rotation = 0;
        }
        if (this.faceGfx) {
            this.faceGfx.scale.set(1);
            this.faceGfx.rotation = 0;
        }
    }

    setEmote(name, duration = 2800) {
        this._stopCurrentEmote();
        this.currentEmote = name;

        // Map to face expression
        const faceMap = {
            idle: 'idle',
            speaking: 'speaking',
            thinking: 'thinking',
            excited: 'excited',
            happy: 'happy',
            shake: 'shake',
            surprised: 'surprised',
        };
        this._drawFace(faceMap[name] ?? 'idle');

        if (name === 'idle') return;
        this._showLabel(name);

        switch (name) {
            case 'speaking': this._animSpeaking(); break;
            case 'thinking': this._animThinking(); break;
            case 'excited': this._animExcited(); break;
            case 'happy': this._animHappy(); break;
            case 'shake': this._animShake(); break;
            case 'surprised': this._animSurprised(); break;
        }

        this._emoteTimer = setTimeout(() => {
            this._stopCurrentEmote();
            this._drawFace('idle');
            this.currentEmote = 'idle';
        }, duration);
    }

    // 🗣️ Speaking — fast micro-wiggle
    _animSpeaking() {
        let t = 0;
        this._emoteTick = (ticker) => {
            t += ticker.deltaTime * 0.3;
            this.container.x = this.baseX + Math.sin(t * 7) * 2.5;
        };
        this.app.ticker.add(this._emoteTick);
    }

    // 🤔 Thinking — slow tilt & sway
    _animThinking() {
        let t = 0;
        this._emoteTick = (ticker) => {
            t += ticker.deltaTime * 0.035;
            this.container.x = this.baseX + Math.sin(t) * 8;
            this.bodyGfx.rotation = Math.sin(t) * 0.08;
            this.faceGfx.rotation = Math.sin(t) * 0.08;
        };
        this.app.ticker.add(this._emoteTick);
    }

    // 🎉 Excited — bounce + scale pop
    _animExcited() {
        let t = 0;
        this._emoteTick = (ticker) => {
            t += ticker.deltaTime * 0.2;
            this.container.y = this.baseY - Math.abs(Math.sin(t * 2.8)) * 20;
            const pop = 1 + Math.sin(t * 5.5) * 0.035;
            this.bodyGfx.scale.set(pop);
            this.faceGfx.scale.set(pop);
        };
        this.app.ticker.add(this._emoteTick);
    }

    // 😊 Happy — squash-stretch jump
    _animHappy() {
        let t = 0;
        this._emoteTick = (ticker) => {
            t += ticker.deltaTime * 0.13;
            const jump = Math.max(0, Math.sin(t * 3.5));
            this.container.y = this.baseY - jump * 30;
            const sx = 1 - jump * 0.08;
            const sy = 1 + jump * 0.12;
            this.bodyGfx.scale.set(sx, sy);
            this.faceGfx.scale.set(sx, sy);
        };
        this.app.ticker.add(this._emoteTick);
    }

    // 😡 Shake — rapid tremble
    _animShake() {
        let t = 0;
        this._emoteTick = (ticker) => {
            t += ticker.deltaTime * 0.8;
            this.container.x = this.baseX + Math.sin(t * 14) * 7;
        };
        this.app.ticker.add(this._emoteTick);
    }

    // 😲 Surprised — quick scale pop then settle
    _animSurprised() {
        let t = 0;
        this._emoteTick = (ticker) => {
            t += ticker.deltaTime * 0.15;
            const pop = 1 + Math.exp(-t * 0.5) * Math.sin(t * 8) * 0.12;
            this.bodyGfx.scale.set(pop);
            this.faceGfx.scale.set(pop);
        };
        this.app.ticker.add(this._emoteTick);
    }

    // ─── Public API ───────────────────────────────────────────────────────────
    setGesture(name) {
        const map = {
            speak: 'speaking', speaking: 'speaking',
            think: 'thinking', thinking: 'thinking',
            excited: 'excited', happy: 'happy',
            error: 'shake', shake: 'shake',
            surprised: 'surprised',
        };
        this.setEmote(map[name] ?? 'idle');
    }

    updatePosition() {
        this.baseX = window.innerWidth - 150;
        this.baseY = 200;
        if (this.currentEmote === 'idle') {
            this.container.x = this.baseX;
            this.container.y = this.baseY;
        }
    }
}


