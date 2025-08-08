// Система частиц для эффектов на карте
export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number; // velocity x
  vy: number; // velocity y
  size: number;
  life: number; // от 0 до 1
  maxLife: number;
  color: string;
  alpha: number;
  type: 'explosion' | 'trail' | 'sparkle';
  gravity?: number;
}

export interface ParticleEmitter {
  x: number;
  y: number;
  color: string;
  particleCount: number;
  type: 'tap' | 'conquest' | 'energy';
  duration: number;
}

export class ParticleSystem {
  private particles: Map<string, Particle> = new Map();
  private nextId = 0;
  
  // Создание взрыва частиц при тапе
  createTapExplosion(x: number, y: number, color: string, intensity = 1): void {
    const particleCount = Math.floor(12 * intensity);
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 3;
      const size = 2 + Math.random() * 3;
      const life = 0.8 + Math.random() * 0.4;
      
      const particle: Particle = {
        id: this.generateId(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        life: 1,
        maxLife: life,
        color,
        alpha: 1,
        type: 'explosion',
        gravity: 0.1
      };
      
      this.particles.set(particle.id, particle);
    }
  }
  
  // Создание следа частиц
  createTrail(x: number, y: number, vx: number, vy: number, color: string): void {
    const particle: Particle = {
      id: this.generateId(),
      x,
      y,
      vx: vx + (Math.random() - 0.5) * 0.5,
      vy: vy + (Math.random() - 0.5) * 0.5,
      size: 1 + Math.random() * 2,
      life: 1,
      maxLife: 0.5 + Math.random() * 0.3,
      color,
      alpha: 0.7,
      type: 'trail'
    };
    
    this.particles.set(particle.id, particle);
  }
  
  // Создание искр при завоевании территории
  createConquestSparkles(x: number, y: number, color: string, count = 6): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const radius = 20 + Math.random() * 30;
      const particleX = x + Math.cos(angle) * radius;
      const particleY = y + Math.sin(angle) * radius;
      
      const particle: Particle = {
        id: this.generateId(),
        x: particleX,
        y: particleY,
        vx: (Math.random() - 0.5) * 1,
        vy: (Math.random() - 0.5) * 1,
        size: 3 + Math.random() * 2,
        life: 1,
        maxLife: 1.2 + Math.random() * 0.8,
        color,
        alpha: 0.9,
        type: 'sparkle'
      };
      
      this.particles.set(particle.id, particle);
    }
  }
  
  // Создание эффекта восстановления энергии
  createEnergyEffect(x: number, y: number, targetX: number, targetY: number): void {
    const particleCount = 8;
    
    for (let i = 0; i < particleCount; i++) {
      // const progress = i / particleCount; // Для будущего использования
      const startX = x + (Math.random() - 0.5) * 20;
      const startY = y + (Math.random() - 0.5) * 20;
      
      const dx = targetX - startX;
      const dy = targetY - startY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const particle: Particle = {
        id: this.generateId(),
        x: startX,
        y: startY,
        vx: (dx / distance) * (2 + Math.random()),
        vy: (dy / distance) * (2 + Math.random()),
        size: 2 + Math.random() * 2,
        life: 1,
        maxLife: 1 + Math.random() * 0.5,
        color: '#00ff88',
        alpha: 0.8,
        type: 'sparkle'
      };
      
      this.particles.set(particle.id, particle);
    }
  }
  
  // Обновление всех частиц
  update(deltaTime: number): void {
    const toRemove: string[] = [];
    
    for (const [id, particle] of this.particles.entries()) {
      // Обновляем позицию
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      
      // Применяем гравитацию
      if (particle.gravity) {
        particle.vy += particle.gravity * deltaTime;
      }
      
      // Обновляем время жизни
      particle.life -= deltaTime / particle.maxLife;
      
      // Обновляем альфа-канал в зависимости от времени жизни
      particle.alpha = Math.max(0, particle.life);
      
      // Эффекты в зависимости от типа
      switch (particle.type) {
        case 'explosion':
          // Частицы взрыва замедляются
          particle.vx *= 0.98;
          particle.vy *= 0.98;
          particle.size *= 0.99;
          break;
          
        case 'trail':
          // Частицы следа быстро исчезают
          particle.size *= 0.95;
          break;
          
        case 'sparkle':
          // Искры мерцают
          particle.alpha = particle.life * (0.7 + 0.3 * Math.sin(Date.now() * 0.01));
          break;
      }
      
      // Удаляем мертвые частицы
      if (particle.life <= 0 || particle.size < 0.1) {
        toRemove.push(id);
      }
    }
    
    // Удаляем мертвые частицы
    toRemove.forEach(id => this.particles.delete(id));
  }
  
  // Рендеринг всех частиц
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    
    for (const particle of this.particles.values()) {
      ctx.save();
      
      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;
      
      // Рендеринг в зависимости от типа
      switch (particle.type) {
        case 'explosion':
          // Круглые частицы взрыва
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
          break;
          
        case 'trail': {
          // Размытые частицы следа
          const gradient = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, particle.size
          );
          gradient.addColorStop(0, particle.color);
          gradient.addColorStop(1, 'transparent');
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
          
        case 'sparkle':
          // Звездочки
          this.drawStar(ctx, particle.x, particle.y, particle.size, particle.color);
          break;
      }
      
      ctx.restore();
    }
    
    ctx.restore();
  }
  
  // Рисование звездочки
  private drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Date.now() * 0.001);
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    
    // Вертикальная линия
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(0, size);
    ctx.stroke();
    
    // Горизонтальная линия
    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(size, 0);
    ctx.stroke();
    
    // Диагональные линии
    ctx.beginPath();
    ctx.moveTo(-size * 0.7, -size * 0.7);
    ctx.lineTo(size * 0.7, size * 0.7);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(size * 0.7, -size * 0.7);
    ctx.lineTo(-size * 0.7, size * 0.7);
    ctx.stroke();
    
    ctx.restore();
  }
  
  // Очистка всех частиц
  clear(): void {
    this.particles.clear();
  }
  
  // Получение количества активных частиц
  getParticleCount(): number {
    return this.particles.size;
  }
  
  // Генерация уникального ID
  private generateId(): string {
    return `particle_${this.nextId++}_${Date.now()}`;
  }
  
  // Создание эффекта в зависимости от типа эмиттера
  createEffect(emitter: ParticleEmitter): void {
    switch (emitter.type) {
      case 'tap':
        this.createTapExplosion(emitter.x, emitter.y, emitter.color);
        break;
        
      case 'conquest':
        this.createConquestSparkles(emitter.x, emitter.y, emitter.color, emitter.particleCount);
        break;
        
      case 'energy':
        // Эффект восстановления энергии требует целевых координат
        // Пока используем простую вспышку
        this.createTapExplosion(emitter.x, emitter.y, '#00ff88', 0.5);
        break;
    }
  }
  
  // Создание непрерывного эффекта (например, при удержании)
  createContinuousEffect(x: number, y: number, color: string, intensity = 1): void {
    if (Math.random() < 0.3 * intensity) {
      this.createTrail(
        x + (Math.random() - 0.5) * 10,
        y + (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        color
      );
    }
  }
}