// src/lib/blockly/game/engine.ts

export class Sprite {
  name: string;
  image: HTMLImageElement | null = null;
  x: number = 0;
  y: number = 0;
  width: number = 0;
  height: number = 0;
  rotation: number = 0;
  speedX: number = 0;
  speedY: number = 0;
  gravity: number = 0;
  gravitySpeed: number = 0;

  constructor(name: string, imageUrl: string, x: number, y: number) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.loadImage(imageUrl);
  }

  private loadImage(imageUrl: string) {
    this.image = new Image();
    this.image.onload = () => {
      this.width = this.image!.width;
      this.height = this.image!.height;
    };
    this.image.src = imageUrl;
  }

  update() {
    this.gravitySpeed += this.gravity;
    this.x += this.speedX;
    this.y += this.speedY + this.gravitySpeed;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.image || !this.image.complete) return;
    
    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    ctx.rotate(this.rotation * Math.PI / 180);
    ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();
  }

  collidesWith(other: Sprite): boolean {
    if (!other) return false;
    return (
      this.x < other.x + other.width &&
      this.x + this.width > other.x &&
      this.y < other.y + other.height &&
      this.y + this.height > other.y
    );
  }
}

export class GameRuntime {
    private ctx: CanvasRenderingContext2D;
    private sprites: Map<string, Sprite> = new Map();
    private pressedKeys: Set<string> = new Set();
    private onStartCallback: () => void = () => {};
    private onTickCallback: () => void = () => {};
    private animationFrameId: number | null = null;
    
    public log: (message: string) => void;
    public error: (message: string) => void;
    public score: number = 0;
    public globalGravity: number = 0;

    constructor(canvas: HTMLCanvasElement, onLog: (msg: string) => void, onError: (msg: string) => void) {
        this.ctx = canvas.getContext('2d')!;
        this.log = onLog;
        this.error = onError;
        this.initEventListeners();
    }

    private initEventListeners() {
        window.addEventListener('keydown', (e) => this.pressedKeys.add(e.key));
        window.addEventListener('keyup', (e) => this.pressedKeys.delete(e.key));
    }

    private cleanupEventListeners() {
        window.removeEventListener('keydown', (e) => this.pressedKeys.add(e.key));
        window.removeEventListener('keyup', (e) => this.pressedKeys.delete(e.key));
    }

    onStart = (callback: () => void) => { this.onStartCallback = callback; };
    onTick = (callback: () => void) => { this.onTickCallback = callback; };
    isKeyDown = (key: string) => this.pressedKeys.has(key);

    clearCanvas = () => this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    drawRect = (x: number, y: number, w: number, h: number, color: string) => {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, w, h);
    };
    drawText = (text: string, x: number, y: number, color: string, font: string) => {
        this.ctx.fillStyle = color;
        this.ctx.font = font;
        this.ctx.fillText(text, x, y);
    }

    createSprite(name: string, imageUrl: string, x: number, y: number) {
      if (this.sprites.has(name)) {
        this.error(`A sprite with the name "${name}" already exists.`);
        return;
      }
      const newSprite = new Sprite(name, imageUrl, x, y);
      this.sprites.set(name, newSprite);
    }
    getSprite = (name: string): Sprite | undefined => this.sprites.get(name);

    changeScore = (amount: number) => { this.score += amount; };
    setGravity = (value: number) => { this.globalGravity = value; };

    private loop = () => {
      this.sprites.forEach(sprite => {
        if (this.globalGravity && !sprite.gravity) {
            sprite.gravity = this.globalGravity;
        }
        sprite.update();
      });

      this.clearCanvas();
      
      this.sprites.forEach(sprite => sprite.draw(this.ctx));
      
      this.onTickCallback();

      this.animationFrameId = requestAnimationFrame(this.loop);
    }

    run(code: string) {
        this.stop(); 
        this.sprites.clear();
        this.pressedKeys.clear();
        this.score = 0;
        this.globalGravity = 0;
        this.onStartCallback = () => {};
        this.onTickCallback = () => {};

        try {
            new Function('game', code)(this);
            this.onStartCallback();
            this.log("Game started.");
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            this.error(`Runtime Error: ${message}`);
            return false;
        }

        this.loop();
        return true;
    }

    stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
            this.log("Game stopped.");
            return true;
        }
        return false;
    }

    cleanup() {
      this.stop();
      this.cleanupEventListeners();
    }
}