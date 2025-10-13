import React, { useEffect, useRef } from "react";
import "./Fireworks.css";

const Fireworks = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const resizeCanvas = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resizeCanvas);

    // Palettes de couleurs plus vives et contrastées
    const colorPalettes = [
      // Palette 1: Couleurs vives primaires
      ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'],
      // Palette 2: Couleurs chaudes
      ['#FF6B35', '#FFA500', '#FFD700', '#FF1493', '#FF69B4', '#FF4500'],
      // Palette 3: Couleurs froides
      ['#1E90FF', '#00CED1', '#7B68EE', '#00FF7F', '#32CD32', '#40E0D0'],
      // Palette 4: Couleurs néon
      ['#FF00FF', '#00FF00', '#00FFFF', '#FFFF00', '#FF0080', '#80FF00']
    ];

    class Rocket {
      constructor() {
        this.x = Math.random() * width;
        this.y = height;
        this.targetY = Math.random() * height * 0.4 + height * 0.1;
        this.speed = Math.random() * 3 + 2;
        this.size = Math.random() * 2 + 1;
        this.palette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
        this.color = this.palette[Math.floor(Math.random() * this.palette.length)];
        this.trail = [];
        this.exploded = false;
        this.brightness = 1;
      }

      update() {
        if (!this.exploded) {
          // Ajouter une particule de traînée
          this.trail.push({
            x: this.x,
            y: this.y,
            alpha: 1,
            size: this.size * 0.8,
            color: this.color
          });

          // Mettre à jour la traînée
          for (let i = this.trail.length - 1; i >= 0; i--) {
            this.trail[i].alpha -= 0.08;
            this.trail[i].size -= 0.03;
            if (this.trail[i].alpha <= 0) {
              this.trail.splice(i, 1);
            }
          }

          // Monter avec scintillement
          this.y -= this.speed;
          this.x += (Math.random() - 0.5) * 1.2;
          this.brightness = 0.8 + Math.random() * 0.4;

          if (this.y <= this.targetY) {
            this.exploded = true;
            createFirework(this.x, this.y, this.palette);
          }
        }
      }

      draw() {
        if (!this.exploded) {
          // Dessiner la traînée
          ctx.save();
          this.trail.forEach(trail => {
            ctx.globalAlpha = trail.alpha;
            ctx.fillStyle = trail.color;
            ctx.beginPath();
            ctx.arc(trail.x, trail.y, trail.size, 0, Math.PI * 2);
            ctx.fill();
          });

          // Dessiner la fusée avec brillance
          ctx.globalAlpha = 1;
          const brightColor = increaseBrightness(this.color, 20);
          ctx.fillStyle = brightColor;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size * this.brightness, 0, Math.PI * 2);
          ctx.fill();
          
          // Effet de lumière autour de la fusée
          ctx.globalAlpha = 0.3;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }

    class Particle {
      constructor(x, y, palette, isSpark = false) {
        this.x = x;
        this.y = y;
        this.palette = palette;
        this.color = palette[Math.floor(Math.random() * palette.length)];
        this.isSpark = isSpark;
        
        if (isSpark) {
          // Étincelles plus rapides
          const angle = Math.random() * 2 * Math.PI;
          const speed = Math.random() * 10 + 5;
          this.vx = Math.cos(angle) * speed;
          this.vy = Math.sin(angle) * speed;
          this.size = Math.random() * 1.2 + 0.3;
          this.decay = Math.random() * 0.04 + 0.02;
          this.gravity = 0.15;
        } else {
          // Particules principales
          const angle = Math.random() * 2 * Math.PI;
          const speed = Math.random() * 8 + 3;
          this.vx = Math.cos(angle) * speed;
          this.vy = Math.sin(angle) * speed;
          this.size = Math.random() * 3 + 1.5;
          this.decay = Math.random() * 0.008 + 0.004;
          this.gravity = 0.06;
        }
        
        this.alpha = 1;
        this.fadeDelay = Math.random() * 0.3;
        this.brightness = 1;
      }

      update() {
        this.vy += this.gravity;
        this.vx *= 0.98;
        this.vy *= 0.98;
        
        this.x += this.vx;
        this.y += this.vy;
        this.brightness = 0.9 + Math.random() * 0.2;
        
        if (this.fadeDelay <= 0) {
          this.alpha -= this.decay;
        } else {
          this.fadeDelay -= 0.016;
        }
      }

      draw() {
        if (this.alpha <= 0) return;

        const brightColor = increaseBrightness(this.color, 30);
        
        // Dessiner un halo lumineux
        ctx.globalAlpha = this.alpha * 0.4;
        ctx.fillStyle = brightColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Particule principale plus brillante
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = brightColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.brightness, 0, Math.PI * 2);
        ctx.fill();

        // Effet de scintillement pour les grosses particules
        if (this.size > 2 && Math.random() > 0.7) {
          ctx.globalAlpha = this.alpha * 0.6;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(
            this.x - this.size * 0.3, 
            this.y - this.size * 0.3, 
            this.size * 0.4, 
            0, 
            Math.PI * 2
          );
          ctx.fill();
        }
      }
    }

    // Fonction pour augmenter la luminosité d'une couleur
    function increaseBrightness(hex, percent) {
      // Convertir hex en RGB
      let r = parseInt(hex.slice(1, 3), 16);
      let g = parseInt(hex.slice(3, 5), 16);
      let b = parseInt(hex.slice(5, 7), 16);

      // Augmenter la luminosité
      r = Math.min(255, r + (255 - r) * percent / 100);
      g = Math.min(255, g + (255 - g) * percent / 100);
      b = Math.min(255, b + (255 - b) * percent / 100);

      // Retourner en hex
      return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
    }

    let rockets = [];
    let particles = [];

    const createFirework = (x, y, palette) => {
      const count = 100 + Math.random() * 80;

      // Particules principales
      for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, palette));
      }

      // Étincelles supplémentaires
      for (let i = 0; i < 40; i++) {
        particles.push(new Particle(x, y, palette, true));
      }

      // Flash d'explosion plus visible
      setTimeout(() => {
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)];
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.fill();
        
        // Second flash plus petit et plus blanc
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = 1;
      }, 0);
    };

    const animate = () => {
      // Canvas transparent
      ctx.clearRect(0, 0, width, height);

      // Mettre à jour et dessiner les fusées
      for (let i = rockets.length - 1; i >= 0; i--) {
        rockets[i].update();
        rockets[i].draw();
        if (rockets[i].exploded) {
          rockets.splice(i, 1);
        }
      }

      // Mettre à jour et dessiner les particules
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].alpha <= 0) {
          particles.splice(i, 1);
        }
      }

      requestAnimationFrame(animate);
    };

    animate();

    // Lancer des fusées automatiquement
    const autoFireworks = setInterval(() => {
      if (rockets.length < 3 && particles.length < 1000) {
        rockets.push(new Rocket());
      }
    }, 1500);

    // Lancer quelques fusées au début
    setTimeout(() => {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          rockets.push(new Rocket());
        }, i * 800);
      }
    }, 500);

    return () => {
      clearInterval(autoFireworks);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fireworks-canvas"
    />
  );
};

export default Fireworks;