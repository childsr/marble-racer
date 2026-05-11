import Phaser from 'phaser';

interface Part {
    id: string;
    type: 'ramp' | 'pin' | 'spinner' | 'flipper-left' | 'flipper-right' | 'bin';
    graphic: Phaser.GameObjects.Shape;
    body: MatterJS.BodyType;
    w: number;
    h: number;
    baseAngle: number;
}

export class MainScene extends Phaser.Scene {
  private mode: 'play' | 'edit' = 'edit';
  private actionListener: any;
  
  private parts: Part[] = [];
  private selectedPart: Part | null = null;
  private selectionBox!: Phaser.GameObjects.Rectangle;

  private marbles: MatterJS.BodyType[] = [];
  private marbleGraphics: Phaser.GameObjects.Shape[] = [];
  private numMarbles = 8;
  private marbleColors = [
    0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 
    0xff44ff, 0x44ffff, 0xff8844, 0x8844ff
  ];

  constructor() {
    super('MainScene');
  }

  preload() {
    // Generate a simple circular texture for particles
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(16, 16, 16);
    graphics.generateTexture('flare', 32, 32);
  }

  create() {
    this.createBoundaryWalls();
    
    // Selection Box visual
    this.selectionBox = this.add.rectangle(0, 0, 100, 100, 0x00ff00, 0);
    this.selectionBox.setStrokeStyle(4, 0x00ff00);
    this.selectionBox.setVisible(false);

    // Initial Layout setup once
    this.setupCourse();

    // Particles for collisions
    const particles = this.add.particles(0, 0, 'flare', {
        speed: { min: 10, max: 50 },
        scale: { start: 0.1, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 300,
        blendMode: 'ADD',
        emitting: false
    });

    this.matter.world.on('collisionstart', (event: any) => {
        if (this.mode !== 'play') return;
        event.pairs.forEach((pair: any) => {
            const { bodyA, bodyB } = pair;
            const isPinMarble = (bodyA.label === 'pin' && bodyB.label === 'marble') || 
                                (bodyB.label === 'pin' && bodyA.label === 'marble');
            if (isPinMarble) {
                const marble = bodyA.label === 'marble' ? bodyA : bodyB;
                particles.emitParticleAt(marble.position.x, marble.position.y, 5);
            }
        });
    });

    this.setupInput();

    // Listen for UI events
    this.actionListener = (e: any) => this.handleEditorAction(e.detail);
    window.addEventListener('phaser-editor-action', this.actionListener);

    // Initial state push
    this.notifyState();
    
    // Resize listener
    this.scale.on('resize', this.resize, this);

    // Cleanup when scene is destroyed
    this.events.once('destroy', () => {
        window.removeEventListener('phaser-editor-action', this.actionListener);
    });
  }

  private handleEditorAction({ action, payload }: { action: string, payload?: any }) {
      if (action === 'toggle-mode') {
          this.setMode(this.mode === 'play' ? 'edit' : 'play');
      } else if (action === 'add-part') {
          this.addNewPart(payload);
      } else if (action === 'delete-part') {
          if (this.selectedPart) {
              this.matter.world.remove(this.selectedPart.body);
              this.selectedPart.graphic.destroy();
              this.parts = this.parts.filter(p => p !== this.selectedPart);
              this.selectPart(null);
          }
      } else if (action === 'rotate-part') {
          if (this.selectedPart) {
              this.selectedPart.baseAngle += Phaser.Math.DegToRad(payload);
              this.matter.body.setAngle(this.selectedPart.body, this.selectedPart.baseAngle);
              this.selectedPart.graphic.setRotation(this.selectedPart.baseAngle);
              this.updateSelectionBox();
          }
      } else if (action === 'scale-part') {
          if (this.selectedPart) {
              const factor = payload > 0 ? 1.2 : 1 / 1.2;
              const newW = this.selectedPart.w * factor;
              // For pins keep proportional, otherwise just lengthen the part
              const newH = this.selectedPart.type === 'pin' ? this.selectedPart.h * factor : this.selectedPart.h;
              
              const type = this.selectedPart.type;
              const x = this.selectedPart.graphic.x;
              const y = this.selectedPart.graphic.y;
              const angle = this.selectedPart.baseAngle;

              this.matter.world.remove(this.selectedPart.body);
              this.selectedPart.graphic.destroy();
              this.parts = this.parts.filter(p => p !== this.selectedPart);
              
              const newPart = this.createPart(type, x, y, newW, newH, angle);
              this.selectPart(newPart);
          }
      } else if (action === 'reset-marbles') {
          this.resetMarbles();
      } else if (action === 'shake-marbles') {
          this.shakeMarbles();
      }
  }

  private setMode(mode: 'play' | 'edit') {
      if (mode === 'play') {
          this.selectedPart = null;
          this.updateSelectionBox();
      }
      
      this.mode = mode;
      if (mode === 'edit') {
          // Remove marbles
          this.marbles.forEach(m => this.matter.world.remove(m));
          this.marbleGraphics.forEach(g => g.destroy());
          this.marbles = [];
          this.marbleGraphics = [];
          // Reset spinners correctly
          this.parts.forEach(part => {
              if (part.type === 'spinner') {
                  this.matter.body.setAngle(part.body, part.baseAngle);
                  part.graphic.setRotation(part.baseAngle);
              }
          });
      } else {
          // Switch to play mode
          this.spawnMarbles();
      }
      this.notifyState();
  }

  private notifyState() {
      window.dispatchEvent(new CustomEvent('phaser-state-change', {
          detail: {
              mode: this.mode,
              hasSelection: !!this.selectedPart
          }
      }));
  }

  update() {
    // Update spinners graphical representation
    this.parts.forEach(part => {
        if (part.type === 'spinner') {
            this.matter.body.setAngle(part.body, part.body.angle + 0.04);
            part.graphic.setRotation(part.body.angle);
            if (this.mode === 'edit' && this.selectedPart === part) {
                this.updateSelectionBox();
            }
        }
    });

    if (this.mode === 'play') {
      // Sync marbles
      for (let i = 0; i < this.marbles.length; i++) {
          const marble = this.marbles[i];
          const graphic = this.marbleGraphics[i];
          graphic.x = marble.position.x;
          graphic.y = marble.position.y;
          graphic.rotation = marble.angle;
      }

      // Update flippers graphical representation
      this.parts.forEach(part => {
          if (part.type.startsWith('flipper')) {
              part.graphic.setRotation(part.body.angle);
          }
      });
    }
  }

  private setupInput() {
    this.input.on('drag', (pointer: any, gameObject: any, dragX: number, dragY: number) => {
        if (this.mode === 'edit') {
            gameObject.emit('custom-drag', pointer, dragX, dragY);
        }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, currentlyOver: any[]) => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        
        if (this.mode === 'edit') {
            if (currentlyOver.length === 0 || currentlyOver[0] === undefined) {
                this.selectPart(null);
            }
        } else if (this.mode === 'play') {
            // Check if we hit any flippers
            this.parts.forEach(part => {
                if (part.type.startsWith('flipper')) {
                    const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, part.graphic.x, part.graphic.y);
                    if (dist < 150) {
                        this.activateFlipper(part);
                    }
                }
            });
        }
    });
  }

  private addNewPart(type: string) {
      const centerX = this.cameras.main.centerX;
      const centerY = this.cameras.main.centerY;
      
      let part;
      if (type === 'ramp') {
          part = this.createPart('ramp', centerX, centerY, 300, 20, 0);
      } else if (type === 'pin') {
          part = this.createPart('pin', centerX, centerY, 14, 14, 0);
      } else if (type === 'spinner') {
          part = this.createPart('spinner', centerX, centerY, 300, 25, 0);
      } else if (type === 'flipper-left') {
          part = this.createPart('flipper-left', centerX, centerY, 150, 20, 0.2);
      } else if (type === 'flipper-right') {
          part = this.createPart('flipper-right', centerX, centerY, 150, 20, -0.2);
      }
      
      if (part) this.selectPart(part);
  }

  private createPart(type: any, x: number, y: number, w: number, h: number, angle: number) {
      let body: MatterJS.BodyType;
      let graphic: Phaser.GameObjects.Shape;

      if (type === 'pin') {
          body = this.matter.add.circle(x, y, w, { 
              isStatic: true, 
              friction: 0,
              restitution: 0.8,
              label: 'pin'
          });
          graphic = this.add.circle(x, y, w, 0x4fc3f7);
      } else {
          body = this.matter.add.rectangle(x, y, w, h, {
              isStatic: true,
              angle: angle,
              friction: 0,
              restitution: type.startsWith('flipper') ? 1.2 : 0.5,
              label: type
          });
          
          let color = 0xffffff;
          if (type === 'spinner') color = 0xff5252;
          else if (type.startsWith('flipper')) color = 0xffeb3b;
          else if (type === 'bin') color = 0x8E9299;

          graphic = this.add.rectangle(x, y, w, h, color);
          graphic.setRotation(angle);
      }

      graphic.setInteractive({ cursor: 'pointer' });
      this.input.setDraggable(graphic);

      const part: Part = { id: Math.random().toString(), type, x, y, w, h, angle, body, graphic, baseAngle: angle } as any;

      graphic.on('custom-drag', (pointer: any, dragX: number, dragY: number) => {
          if (this.mode !== 'edit') return;
          graphic.x = dragX;
          graphic.y = dragY;
          this.matter.body.setPosition(body, { x: dragX, y: dragY });
          this.updateSelectionBox();
      });

      graphic.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          if (this.mode !== 'edit') return;
          this.selectPart(part);
      });

      this.parts.push(part);
      return part;
  }

  private activateFlipper(part: Part) {
    const isLeft = part.type === 'flipper-left';
    const kickAngle = isLeft ? -Math.PI / 4 : Math.PI / 4;
    
    this.matter.body.setAngle(part.body, part.baseAngle + kickAngle);
    
    this.time.delayedCall(150, () => {
        if (this.mode === 'play' && this.parts.includes(part)) {
            this.matter.body.setAngle(part.body, part.baseAngle);
        }
    });
  }

  private updateSelectionBox() {
      if (this.selectedPart) {
          this.selectionBox.setVisible(true);
          this.selectionBox.setPosition(this.selectedPart.graphic.x, this.selectedPart.graphic.y);
          this.selectionBox.setRotation(this.selectedPart.graphic.rotation);
          
          if (this.selectedPart.type === 'pin') {
              this.selectionBox.setSize(this.selectedPart.w * 2 + 10, this.selectedPart.w * 2 + 10);
          } else {
              this.selectionBox.setSize(this.selectedPart.w + 10, this.selectedPart.h + 10);
          }
          this.selectionBox.setDepth(100);
      } else {
          this.selectionBox.setVisible(false);
      }
  }

  private selectPart(part: Part | null) {
      if (this.mode !== 'edit') return;
      this.selectedPart = part;
      this.updateSelectionBox();
      this.notifyState();
  }

  private createBoundaryWalls() {
    const { width, height } = this.scale;
    const wallColor = 0x8E9299;
    const wallThickness = 20;

    // Boundary walls
    this.matter.add.rectangle(width / 2, 10, width, wallThickness, { isStatic: true });
    this.matter.add.rectangle(width / 2, height - 10, width, wallThickness, { isStatic: true });
    this.matter.add.rectangle(10, height / 2, wallThickness, height, { isStatic: true });
    this.matter.add.rectangle(width - 10, height / 2, wallThickness, height, { isStatic: true });

    this.add.rectangle(width / 2, 10, width, wallThickness, wallColor);
    this.add.rectangle(width / 2, height - 10, width, wallThickness, wallColor);
    this.add.rectangle(10, height / 2, wallThickness, height, wallColor);
    this.add.rectangle(width - 10, height / 2, wallThickness, height, wallColor);
  }

  private createRampBetween(x1: number, y1: number, x2: number, y2: number, thickness: number) {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      return this.createPart('ramp', midX, midY, distance, thickness, angle);
  }

  private setupCourse() {
    // Basic landscape course to jump into editing
    this.createRampBetween(50, 150, 800, 250, 15);
    this.createRampBetween(850, 300, 1750, 400, 15);
    this.createRampBetween(1850, 450, 1600, 500, 15);

    const pinRows = 6;
    const pinGapX = 80;
    const pinGapY = 70;
    const startY = 550;
    
    for (let row = 0; row < pinRows; row++) {
        const cols = row % 2 === 0 ? 6 : 5;
        const rowWidth = (cols - 1) * pinGapX;
        const startX = 1450 - rowWidth / 2;
        
        for (let col = 0; col < cols; col++) {
            const x = startX + col * pinGapX;
            const y = startY + row * pinGapY;
            this.createPart('pin', x, y, 10, 10, 0);
        }
    }

    this.createRampBetween(1600, 950, 700, 980, 15);
    this.createPart('spinner', 850, 820, 350, 25, 0);

    this.createPart('flipper-left', 350, 950, 120, 15, 0.2);
    this.createPart('flipper-right', 550, 950, 120, 15, -0.2);

    const binCount = 5;
    const binWidth = 120;
    const binStartX = 150;
    const binY = 1080 - 80;

    for (let i = 0; i <= binCount; i++) {
        const x = binStartX + i * binWidth;
        this.createPart('bin', x, binY + 40, 15, 80, 0);
    }
  }

  private spawnMarbles() {
    for (let i = 0; i < this.numMarbles; i++) {
      const x = 100 + (i % 4) * 30;
      const y = 80 - Math.floor(i / 4) * 30;
      const color = this.marbleColors[i % this.marbleColors.length];
      
      const marble = this.matter.add.circle(x, y, 14, {
        restitution: 0.6,
        friction: 0,
        frictionAir: 0,
        mass: 1.5,
        label: 'marble'
      });

      const graphic = this.add.circle(x, y, 14, color);
      graphic.setDepth(50);
      
      this.marbles.push(marble);
      this.marbleGraphics.push(graphic);
    }
  }

  private resetMarbles() {
    if (this.mode !== 'play') return;
    this.marbles.forEach((marble, i) => {
        const x = 100 + (i % 4) * 30;
        const y = 80 - Math.floor(i / 4) * 30;
        this.matter.body.setPosition(marble, { x, y });
        this.matter.body.setVelocity(marble, { x: 0, y: 0 });
        this.matter.body.setAngularVelocity(marble, 0);
    });
  }

  private shakeMarbles() {
    if (this.mode !== 'play') return;
    this.marbles.forEach(marble => {
        const forceX = (Math.random() - 0.5) * 0.05;
        const forceY = (Math.random() - 0.5) * 0.05;
        this.matter.body.applyForce(marble, marble.position, { x: forceX, y: forceY });
    });
  }

  private resize(gameSize: Phaser.Structs.Size) {
    const { width, height } = gameSize;
    this.cameras.main.setViewport(0, 0, width, height);
  }
}
