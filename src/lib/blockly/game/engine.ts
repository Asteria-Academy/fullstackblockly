// src/lib/blockly/game/engine.ts

export class Sprite {
  name: string;
  image: HTMLImageElement | null = null;
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  rotation = 0; // degrees
  speedX = 0; // units per frame (adjusted by delta internally)
  speedY = 0;
  gravity = 0; // per frame acceleration applied directly to speedY
  maxFallSpeed = 25; // terminal velocity (pixels per frame at 60fps equivalent)
  visible = true;
  size = 100; // percentage of original
  originalWidth = 0;
  originalHeight = 0;
  private pendingSizePercent: number | null = null;
  useGlobalGravity = true; // if false, global gravity will not be applied

  constructor(name: string, imageUrl: string, x: number, y: number) {
    this.name = name;
    this.x = x;
    this.y = y;
    if (imageUrl) this.loadImage(imageUrl);
  }

  private loadImage(imageUrl: string) {
    const img = new Image();
    img.onload = () => {
      // Preserve original size for scaling operations
      this.originalWidth = img.width;
      this.originalHeight = img.height;
  const sizePct = this.pendingSizePercent ?? this.size;
  this.size = sizePct;
  this.width = img.width * (sizePct / 100);
  this.height = img.height * (sizePct / 100);
  this.pendingSizePercent = null;
    };
    img.onerror = () => {
      console.warn(`Sprite '${this.name}' failed to load image: ${imageUrl}`);
    };
    img.src = imageUrl;
    this.image = img;
  }

  setSize(percent: number) {
    this.size = Math.max(1, percent); // avoid 0 which would hide sprite & break collision
    if (this.originalWidth && this.originalHeight) {
      this.width = this.originalWidth * (this.size / 100);
      this.height = this.originalHeight * (this.size / 100);
    } else {
      // image not loaded yet, store request
      this.pendingSizePercent = this.size;
    }
  }

  // Set width keeping original aspect ratio (if known)
  setScaledWidth(newWidth: number) {
    if (!this.originalWidth || !this.originalHeight) return; // defer until loaded
    const ratio = this.originalHeight / this.originalWidth;
    this.width = newWidth;
    this.height = newWidth * ratio;
    this.size = (this.width / this.originalWidth) * 100;
  }
  // Set height keeping original aspect ratio (if known)
  setScaledHeight(newHeight: number) {
    if (!this.originalWidth || !this.originalHeight) return;
    const ratio = this.originalWidth / this.originalHeight;
    this.height = newHeight;
    this.width = newHeight * ratio;
    this.size = (this.width / this.originalWidth) * 100;
  }

  updateSize() {
    // keep backwards compatibility
    this.setSize(this.size);
  }

  update(deltaMs?: number) {
    const dt = deltaMs ? deltaMs / 16.6667 : 1;
    // Apply gravity to speedY directly; clamp downward terminal velocity.
    this.speedY += this.gravity * dt;
    if (this.speedY > this.maxFallSpeed) this.speedY = this.maxFallSpeed;
    this.x += this.speedX * dt;
    this.y += this.speedY * dt;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.visible || !this.image || !this.image.complete || this.width === 0 || this.height === 0) return;
    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    if (this.rotation) ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();
  }

  collidesWith(other: Sprite | undefined | null): boolean {
    if (!other) return false;
    return (
      this.x < other.x + other.width &&
      this.x + this.width > other.x &&
      this.y < other.y + other.height &&
      this.y + this.height > other.y
    );
  }

  bounceOnEdge(canvasWidth: number, canvasHeight: number) {
    if (this.x < 0) {
      this.x = 0;
      this.speedX *= -1;
    } else if (this.x + this.width > canvasWidth) {
      this.x = canvasWidth - this.width;
      this.speedX *= -1;
    }
    if (this.y < 0) {
      this.y = 0;
      this.speedY *= -1;
    } else if (this.y + this.height > canvasHeight) {
      this.y = canvasHeight - this.height;
      this.speedY *= -1;
    }
  }
}

export class GameRuntime {
  private ctx: CanvasRenderingContext2D;
  private sprites: Map<string, Sprite> = new Map();
  private pressedKeys: Set<string> = new Set();
  private onStartCallback: () => void = () => {};
  private onTickCallback: () => void = () => {};
  private onAssetsLoadedCallback: () => void = () => {};
  private animationFrameId: number | null = null;
  private lastFrameTime: number | null = null;
  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;

  public log: (message: string) => void;
  public error: (message: string) => void;
  public score = 0;
  // globalGravity deprecated; keep for backward compatibility (set to 0)
  public globalGravity = 0;
  public deltaMs = 0; // last frame delta milliseconds
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private pendingAudio: Set<string> = new Set();
  private stoppedDueToError = false;
  private pixelRatio = 1;
  private pendingAssets = 0; // number of images still loading (pre-start)
  private startRequested = false; // run() has asked to start
  private started = false; // loop actually running
  private useFixedTimeStep = true;
  private accumulatorMs = 0;
  private readonly fixedStepMs = 16.6667; // 60fps

  constructor(canvas: HTMLCanvasElement, onLog: (msg: string) => void, onError: (msg: string) => void) {
    this.ctx = canvas.getContext("2d")!;
    this.log = onLog;
    this.error = onError;
    // Bind handlers so we can remove them later
    this.keyDownHandler = (e: KeyboardEvent) => this.pressedKeys.add(e.key);
    this.keyUpHandler = (e: KeyboardEvent) => this.pressedKeys.delete(e.key);
    this.initEventListeners();
  }

  private initEventListeners() {
    window.addEventListener("keydown", this.keyDownHandler);
    window.addEventListener("keyup", this.keyUpHandler);
  }

  private cleanupEventListeners() {
    window.removeEventListener("keydown", this.keyDownHandler);
    window.removeEventListener("keyup", this.keyUpHandler);
  }

  onStart = (callback: () => void) => {
    this.onStartCallback = callback;
  };
  onTick = (callback: () => void) => {
    this.onTickCallback = callback;
  };
  onAssetsLoaded = (callback: () => void) => {
    this.onAssetsLoadedCallback = callback;
  };
  isKeyDown = (key: string) => this.pressedKeys.has(key);

  clearCanvas = () =>
    {
      // Reset transform to reliably clear full surface then restore scaling
      const w = this.ctx.canvas.width;
      const h = this.ctx.canvas.height;
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, w, h);
      if (this.pixelRatio !== 1) this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    };
  getCanvasWidth = () => this.ctx.canvas.width;
  getCanvasHeight = () => this.ctx.canvas.height;

  // Resize canvas to logical (CSS) width/height and adjust for device pixel ratio
  resizeCanvas(logicalWidth: number, logicalHeight: number, dpr: number = window.devicePixelRatio || 1) {
    const canvas = this.ctx.canvas;
    canvas.width = Math.max(1, Math.floor(logicalWidth * dpr));
    canvas.height = Math.max(1, Math.floor(logicalHeight * dpr));
    canvas.style.width = `${logicalWidth}px`;
    canvas.style.height = `${logicalHeight}px`;
    this.pixelRatio = dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // High quality smoothing for downscaled images
  this.ctx.imageSmoothingEnabled = true;
  const ctx2 = this.ctx as CanvasRenderingContext2D & { imageSmoothingQuality?: string };
  if (typeof ctx2.imageSmoothingQuality !== 'undefined') ctx2.imageSmoothingQuality = 'high';
  }

  setPixelRatio(dpr: number) {
    this.resizeCanvas(this.ctx.canvas.clientWidth || this.ctx.canvas.width, this.ctx.canvas.clientHeight || this.ctx.canvas.height, dpr);
  }
  drawRect = (x: number, y: number, w: number, h: number, color: string) => {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  };
  drawText = (
    text: string,
    x: number,
    y: number,
    color: string,
    font: string
  ) => {
    this.ctx.fillStyle = color;
    this.ctx.font = font;
    this.ctx.fillText(text, x, y);
  };

  createSprite(name: string, imageUrl: string, x: number, y: number) {
    if (this.sprites.has(name)) {
      this.error(`A sprite with the name "${name}" already exists.`);
      return;
    }
    const newSprite = new Sprite(name, imageUrl, x, y);
    this.sprites.set(name, newSprite);
    // If game not started yet and image loading asynchronously, count towards pending assets
    const img = newSprite.image;
    if (!this.started && img && !img.complete) {
      this.pendingAssets++;
      const prevOnLoad = img.onload?.bind(img) || null;
      const prevOnError = img.onerror?.bind(img) || null;
      img.onload = (ev) => {
        if (prevOnLoad) prevOnLoad(ev);
        this.assetLoaded();
      };
      img.onerror = (ev) => {
        if (prevOnError) prevOnError(ev);
        this.error(`Failed to load image for sprite '${name}'.`);
        this.assetLoaded();
      };
    }
    return newSprite;
  }
  getSprite = (name: string): Sprite | undefined => this.sprites.get(name);
  getSprites = (): Sprite[] => Array.from(this.sprites.values());
  removeSprite = (name: string) => this.sprites.delete(name);

  changeScore = (amount: number) => {
    this.score += amount;
  };
  // Deprecated no-op (legacy block removed)
  setGravity = () => { /* deprecated */ };

  playSound(url: string) {
    if (this.audioCache.has(url)) {
      this.audioCache.get(url)!.currentTime = 0; // restart sound
      this.audioCache.get(url)!.play();
      return;
    }
    if (this.pendingAudio.has(url)) return; // already loading
    this.pendingAudio.add(url);
    const audio = new Audio(url);
    audio.oncanplaythrough = () => {
      this.audioCache.set(url, audio);
      this.pendingAudio.delete(url);
      audio.play();
    };
    audio.onerror = () => {
      this.pendingAudio.delete(url);
      this.error(`Could not load sound from: ${url}`);
    };
  }

  private loop = (timestamp: number) => {
    if (this.stoppedDueToError) return;
    if (this.lastFrameTime == null) this.lastFrameTime = timestamp;
    const frameDelta = timestamp - this.lastFrameTime;
    this.deltaMs = frameDelta;
    this.lastFrameTime = timestamp;

    if (this.useFixedTimeStep) {
      this.accumulatorMs += Math.min(frameDelta, 250); // cap
      while (this.accumulatorMs >= this.fixedStepMs) {
        this.step(this.fixedStepMs);
        this.accumulatorMs -= this.fixedStepMs;
      }
    } else {
      this.step(frameDelta);
    }

    this.clearCanvas();
    this.sprites.forEach((sprite) => sprite.draw(this.ctx));
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private step(stepMs: number) {
    // Run user tick before physics like Scratch semantics
    try {
      this.onTickCallback();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.error(`Tick Error: ${msg}`);
      this.stoppedDueToError = true;
      this.stop();
      return;
    }
    this.sprites.forEach((s) => s.update(stepMs));
  }

  setFixedTimeStep(enabled: boolean) { this.useFixedTimeStep = enabled; }

  private assetLoaded() {
    if (this.pendingAssets > 0) this.pendingAssets--;
    if (this.pendingAssets === 0 && this.startRequested && !this.started) {
      this.startGameLoop();
    }
  }

  private startGameLoop() {
    this.started = true;
    // Fire assets loaded hook right before first frame
    try {
      this.onAssetsLoadedCallback();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.error(`Assets Loaded Handler Error: ${msg}`);
    }
    this.lastFrameTime = null;
    this.animationFrameId = requestAnimationFrame(this.loop);
    this.log("Game started.");
  }

  run(code: string) {
    this.stop();
    this.stoppedDueToError = false;
    this.sprites.clear();
    this.pressedKeys.clear();
    this.score = 0;
  this.globalGravity = 0; // legacy
    this.onStartCallback = () => {};
    this.onTickCallback = () => {};
  this.onAssetsLoadedCallback = () => {};
    this.lastFrameTime = null;
    this.deltaMs = 0;
    this.pendingAssets = 0;
    this.startRequested = false;
    this.started = false;

    try {
      // Execute user script with 'game' exposed. Intentionally sandbox-limited.
      new Function("game", code)(this);
      // Guard start callback
      try {
        this.onStartCallback();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.error(`Start Error: ${msg}`);
        return false;
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.error(`Runtime Error: ${message}`);
      return false;
    }
    // Request to start loop once assets ready
    this.startRequested = true;
    if (this.pendingAssets === 0) {
      this.startGameLoop();
    } else {
      this.log(`Waiting for ${this.pendingAssets} asset(s) to load...`);
    }
    return true;
  }

  stop() {
    if (this.animationFrameId != null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
      this.log("Game stopped.");
      return true;
    }
  this.started = false;
    return false;
  }

  cleanup() {
    this.stop();
    this.cleanupEventListeners();
    this.sprites.clear();
  }
}
