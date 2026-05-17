import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

interface Ripple {
  x: number;
  y: number;
  r: number;
  maxR: number;
  opacity: number;
}

const InteractiveBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const ripplesRef = useRef<Ripple[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const count = Math.floor((canvas.width * canvas.height) / 10000); // Increased density
      const colors = ['#00af87', '#5A5A40', '#141414'];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 3 + 0.5,
          opacity: Math.random() * 0.4 + 0.1,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    const drawLine = (p1: Particle, p2: Particle, dist: number) => {
      const maxDist = 120;
      if (dist < maxDist) {
        ctx.beginPath();
        const opacity = (1 - dist / maxDist) * 0.3;
        ctx.strokeStyle = `rgba(0, 175, 135, ${opacity})`;
        ctx.lineWidth = 0.4;
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    };

    const update = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Mouse Searchlight / Vignette
      const searchlight = ctx.createRadialGradient(
        mouseRef.current.x, mouseRef.current.y, 0,
        mouseRef.current.x, mouseRef.current.y, 400
      );
      searchlight.addColorStop(0, 'rgba(0, 175, 135, 0.08)');
      searchlight.addColorStop(1, 'rgba(245, 245, 240, 0)');
      ctx.fillStyle = searchlight;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Update and Draw Particles
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        // Mouse influence
        const dx = mouseRef.current.x - p.x;
        const dy = mouseRef.current.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 150) {
          const angle = Math.atan2(dy, dx);
          const force = (150 - dist) / 1500;
          p.vx -= Math.cos(angle) * force;
          p.vy -= Math.sin(angle) * force;
        }

        // Screen wrap
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color === '#00af87' 
          ? `rgba(0, 175, 135, ${p.opacity * (dist < 150 ? 2 : 1)})` 
          : `rgba(20, 20, 20, ${p.opacity * 0.2})`;
        ctx.fill();

        // Connect nearby
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dxLine = p.x - p2.x;
          const dyLine = p.y - p2.y;
          const distLine = Math.sqrt(dxLine * dxLine + dyLine * dyLine);
          drawLine(p, p2, distLine);
        }
      });

      // 3. Ripples
      ripplesRef.current = ripplesRef.current.filter(r => r.opacity > 0.01);
      ripplesRef.current.forEach(r => {
        r.r += 2;
        r.opacity *= 0.96;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 175, 135, ${r.opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      animationFrameId = requestAnimationFrame(update);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleClick = (e: MouseEvent) => {
      ripplesRef.current.push({
        x: e.clientX,
        y: e.clientY,
        r: 0,
        maxR: 100,
        opacity: 0.5,
      });
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleClick);
    
    resize();
    update();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <div 
        className="fixed top-0 left-0 w-full h-full -z-20 opacity-35 bg-center bg-cover bg-no-repeat pointer-events-none mix-blend-multiply transition-opacity duration-1000"
        style={{ backgroundImage: 'url("/src/assets/images/world_explorer_global_bg_1779013605617.png")' }}
      />
      <canvas
        ref={canvasRef}
        id="interactive-bg"
        className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none opacity-70"
      />
    </>
  );
};

export default InteractiveBackground;
