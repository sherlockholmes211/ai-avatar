
// Uses window.PIXI from CDN

class IsometricCharacter {
    constructor(app) {
        this.app = app;
        this.container = new PIXI.Container();
        this.app.stage.addChild(this.container);

        this.setupBody();

        // Add to ticker
        this.app.ticker.add((ticker) => {
            const delta = ticker.deltaTime;
            this.update(delta);
        });
    }

    setupBody() {
        this.bodyParts = {};

        // Use a bigger pixel size for visibility
        const p = 8; // DOUBLED for visibility

        // Shadow
        this.bodyParts.shadow = this.createPart(0, 0, 8 * p, 4 * p, 0x000000, 0.3);

        // Feet (dark blue)
        this.bodyParts.legL = this.createPart(-2 * p, 0, 2 * p, 3 * p, 0x1a252f);
        this.bodyParts.legR = this.createPart(2 * p, 0, 2 * p, 3 * p, 0x1a252f);

        // Torso (bright blue hoodie)
        this.bodyParts.torso = this.createPart(0, -5 * p, 6 * p, 7 * p, 0x3498db);

        // Head (skin tone)
        this.bodyParts.head = this.createPart(0, -11 * p, 5 * p, 5 * p, 0xf5d5c8);

        // Eyes (black) to face front
        this.bodyParts.eyeL = this.createPart(-1 * p, -11.5 * p, 1 * p, 1 * p, 0x000000);
        this.bodyParts.eyeR = this.createPart(1 * p, -11.5 * p, 1 * p, 1 * p, 0x000000);

        // Hair (pink)
        this.bodyParts.hair = this.createPart(0, -13 * p, 6 * p, 4 * p, 0xffb7c5);

        // Arm Left
        this.bodyParts.armL = this.createPart(-4 * p, -5 * p, 2 * p, 5 * p, 0x2980b9);
        // Arm Right
        this.bodyParts.armR = this.createPart(4 * p, -5 * p, 2 * p, 5 * p, 0x2980b9);
    }

    createPart(x, y, width, height, color, alpha = 1) {
        const graphics = new PIXI.Graphics();
        graphics.rect(-width / 2, -height / 2, width, height).fill({ color, alpha });
        graphics.x = x;
        graphics.y = y;
        this.container.addChild(graphics);
        return graphics;
    }

    update(delta) {
        // Avatar is completely static
    }

    setGesture(gestureName) {
        // Placeholder for future hand gestures based on LLM output
        console.log(`Setting gesture: ${gestureName}`);
    }
}
