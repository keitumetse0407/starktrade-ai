'use client';

import { useEffect, useRef, ReactNode } from 'react';

// AntiGravity-inspired floating 3D card
export function FloatingCard({ 
  children, 
  className = '', 
  delay = 0,
  intensity = 1 
}: { 
  children: ReactNode; 
  className?: string; 
  delay?: number;
  intensity?: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = (y - centerY) / 20 * intensity;
      const rotateY = (centerX - x) / 20 * intensity;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
    };

    const handleMouseLeave = () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [intensity]);

  return (
    <div
      ref={cardRef}
      className={`transition-transform duration-300 ease-out ${className}`}
      style={{
        animation: `float ${6 + delay}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        transformStyle: 'preserve-3d',
      }}
    >
      {children}
    </div>
  );
}

// Ambient gradient orb (AntiGravity background effect)
export function GradientOrb({ 
  color = 'electric', 
  size = 400, 
  position = 'top-left',
  delay = 0 
}: {
  color?: 'electric' | 'profit' | 'loss' | 'gold';
  size?: number;
  position?: string;
  delay?: number;
}) {
  const colors = {
    electric: 'rgba(0, 212, 255, 0.15)',
    profit: 'rgba(0, 255, 136, 0.1)',
    loss: 'rgba(255, 51, 102, 0.08)',
    gold: 'rgba(255, 215, 0, 0.1)',
  };

  const positions: Record<string, string> = {
    'top-left': 'top: -100px; left: -100px;',
    'top-right': 'top: -100px; right: -100px;',
    'bottom-left': 'bottom: -100px; left: -100px;',
    'bottom-right': 'bottom: -100px; right: -100px;',
    'center': 'top: 50%; left: 50%; transform: translate(-50%, -50%);',
  };

  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        background: colors[color],
        filter: `blur(${size / 2}px)`,
        animation: `pulse-orb 8s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        ...Object.fromEntries(positions[position]?.split(';').filter(Boolean).map(s => {
          const [key, val] = s.split(':').map(t => t.trim());
          return [key, val];
        }) || []),
      }}
    />
  );
}

// Parallax depth container
export function ParallaxContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const elements = container.querySelectorAll('[data-parallax]');
      
      elements.forEach((el) => {
        const speed = parseFloat(el.getAttribute('data-parallax') || '0.1');
        const yPos = scrollY * speed;
        (el as HTMLElement).style.transform = `translateY(${yPos}px)`;
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

// Animated grid background (AntiGravity style)
export function AnimatedGrid() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          animation: 'grid-move 20s linear infinite',
        }}
      />
      <style jsx>{`
        @keyframes grid-move {
          0% { transform: translateY(0); }
          100% { transform: translateY(60px); }
        }
      `}</style>
    </div>
  );
}

// Glowing line (AntiGravity separator)
export function GlowingLine({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="h-px bg-gradient-to-r from-transparent via-electric/50 to-transparent" />
      <div className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-electric to-transparent blur-sm" />
    </div>
  );
}

// Floating particles
export function FloatingParticles({ count = 20 }: { count?: number }) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-electric/30 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float-particle ${10 + Math.random() * 20}s linear infinite`,
            animationDelay: `${Math.random() * 10}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes float-particle {
          0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// Glassmorphism depth layers
export function DepthGlass({ 
  children, 
  depth = 1, 
  className = '' 
}: { 
  children: ReactNode; 
  depth?: 1 | 2 | 3;
  className?: string;
}) {
  const depths = {
    1: { blur: 10, opacity: 0.6, border: 0.08 },
    2: { blur: 20, opacity: 0.7, border: 0.12 },
    3: { blur: 30, opacity: 0.8, border: 0.16 },
  };

  const d = depths[depth];

  return (
    <div
      className={`rounded-2xl transition-all duration-500 ${className}`}
      style={{
        background: `rgba(26, 31, 61, ${d.opacity})`,
        backdropFilter: `blur(${d.blur}px) saturate(180%)`,
        border: `1px solid rgba(0, 212, 255, ${d.border})`,
        boxShadow: depth === 3 ? '0 0 40px rgba(0, 212, 255, 0.1)' : undefined,
      }}
    >
      {children}
    </div>
  );
}
