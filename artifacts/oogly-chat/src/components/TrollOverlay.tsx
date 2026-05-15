import { useEffect, useState, useRef } from "react";

export type TrollEffect = "explosion" | "fake_ban" | "matrix" | "disco" | "upside_down" | "earthquake" | "ghost";

interface TrollOverlayProps {
  effect: TrollEffect | null;
  onDone: () => void;
}

export function TrollOverlay({ effect, onDone }: TrollOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!effect) return;
    let timer: ReturnType<typeof setTimeout>;
    let interval: ReturnType<typeof setInterval>;

    if (effect === "fake_ban") {
      setCountdown(5);
      interval = setInterval(() => setCountdown((c) => c - 1), 1000);
      timer = setTimeout(onDone, 5000);
    } else if (effect === "upside_down") {
      document.documentElement.style.transform = "rotate(180deg)";
      document.documentElement.style.transition = "transform 0.5s ease";
      timer = setTimeout(() => {
        document.documentElement.style.transform = "";
        onDone();
      }, 5000);
    } else if (effect === "earthquake") {
      document.documentElement.classList.add("troll-earthquake");
      timer = setTimeout(() => {
        document.documentElement.classList.remove("troll-earthquake");
        onDone();
      }, 3000);
    } else if (effect === "ghost") {
      document.documentElement.style.filter = "invert(0.9) hue-rotate(180deg) brightness(0.3)";
      document.documentElement.style.transition = "filter 0.3s";
      timer = setTimeout(() => {
        document.documentElement.style.filter = "";
        onDone();
      }, 4000);
    } else if (effect === "matrix") {
      const canvas = canvasRef.current;
      if (!canvas) { timer = setTimeout(onDone, 4000); return; }
      const ctx = canvas.getContext("2d");
      if (!ctx) { timer = setTimeout(onDone, 4000); return; }
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*アイウエオカキクケコ";
      const fontSize = 14;
      const cols = Math.floor(canvas.width / fontSize);
      const drops: number[] = Array(cols).fill(1);
      const raf = { id: 0 };
      const draw = () => {
        ctx.fillStyle = "rgba(0,0,0,0.05)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#0f0";
        ctx.font = `${fontSize}px monospace`;
        for (let i = 0; i < drops.length; i++) {
          ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * fontSize, drops[i] * fontSize);
          if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
          drops[i]++;
        }
        raf.id = requestAnimationFrame(draw);
      };
      raf.id = requestAnimationFrame(draw);
      timer = setTimeout(() => {
        cancelAnimationFrame(raf.id);
        onDone();
      }, 5000);
    } else if (effect === "disco") {
      timer = setTimeout(onDone, 4000);
    } else if (effect === "explosion") {
      const canvas = canvasRef.current;
      if (!canvas) { timer = setTimeout(onDone, 3000); return; }
      const ctx = canvas.getContext("2d");
      if (!ctx) { timer = setTimeout(onDone, 3000); return; }
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const particles: Array<{ x: number; y: number; vx: number; vy: number; r: number; color: string; life: number }> = [];
      const colors = ["#ff4500", "#ffd700", "#ff6b6b", "#ff8c00", "#ffff00", "#ff1493", "#00ff7f"];
      for (let i = 0; i < 200; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 8;
        particles.push({ x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 3, r: 2 + Math.random() * 4, color: colors[Math.floor(Math.random() * colors.length)], life: 1 });
      }
      const raf = { id: 0 };
      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        for (const p of particles) {
          if (p.life <= 0) continue;
          alive = true;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.15;
          p.life -= 0.015;
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (alive) raf.id = requestAnimationFrame(draw);
        else onDone();
      };
      raf.id = requestAnimationFrame(draw);
      timer = setTimeout(() => { cancelAnimationFrame(raf.id); onDone(); }, 5000);
    }

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      document.documentElement.style.transform = "";
      document.documentElement.style.filter = "";
      document.documentElement.classList.remove("troll-earthquake");
    };
  }, [effect, onDone]);

  if (!effect) return null;

  if (effect === "fake_ban") {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90">
        <div className="max-w-lg w-full mx-4 rounded-lg border-2 border-red-600 bg-zinc-900 p-8 text-center shadow-2xl">
          <div className="text-6xl mb-4">🔨</div>
          <h1 className="text-3xl font-black text-red-500 mb-2">YOU HAVE BEEN BANNED</h1>
          <p className="text-muted-foreground mb-4">
            You have been permanently banned from Oogly Chat for violating our community guidelines.
          </p>
          <div className="bg-zinc-800 rounded p-3 text-left text-sm mb-4 font-mono">
            <p className="text-red-400">Reason: Being too awesome for this chat</p>
            <p className="text-muted-foreground">Duration: Permanent</p>
            <p className="text-muted-foreground">Appeal: Never gonna happen 😂</p>
          </div>
          <p className="text-xs text-muted-foreground">
            This is a joke! Screen will clear in {countdown}s...
          </p>
          <div className="mt-3 h-1 bg-zinc-700 rounded-full overflow-hidden">
            <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${(countdown / 5) * 100}%` }} />
          </div>
        </div>
      </div>
    );
  }

  if (effect === "disco") {
    return (
      <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
        <div className="disco-flash" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-8xl animate-bounce">🕺</div>
        </div>
      </div>
    );
  }

  if (effect === "matrix" || effect === "explosion") {
    return (
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-[9999] pointer-events-none"
      />
    );
  }

  return null;
}
