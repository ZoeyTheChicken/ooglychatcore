import { useEffect, useState, useRef } from "react";

export type TrollEffect =
  | "explosion" | "fake_ban" | "matrix" | "disco" | "upside_down" | "earthquake" | "ghost"
  | "hacker" | "spin" | "rick_roll" | "rain" | "hypnosis" | "confetti" | "police"
  | "zoom_pulse" | "black_screen" | "strobe";

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
    const el = document.documentElement;

    const cleanup = () => {
      el.style.transform = "";
      el.style.transition = "";
      el.style.filter = "";
      el.style.animation = "";
      el.classList.remove("troll-earthquake");
      clearTimeout(timer);
      clearInterval(interval);
    };

    switch (effect) {
      case "upside_down":
        el.style.transform = "rotate(180deg)";
        el.style.transition = "transform 0.5s ease";
        timer = setTimeout(() => { cleanup(); onDone(); }, 5000);
        break;

      case "earthquake":
        el.classList.add("troll-earthquake");
        timer = setTimeout(() => { cleanup(); onDone(); }, 3000);
        break;

      case "ghost":
        el.style.filter = "invert(0.9) hue-rotate(180deg) brightness(0.3)";
        el.style.transition = "filter 0.3s";
        timer = setTimeout(() => { cleanup(); onDone(); }, 4000);
        break;

      case "spin":
        el.style.transition = "transform 4s ease-in-out";
        el.style.transform = "rotate(720deg)";
        timer = setTimeout(() => { cleanup(); onDone(); }, 4200);
        break;

      case "zoom_pulse": {
        let toggled = false;
        el.style.transition = "transform 0.3s ease-in-out";
        el.style.transformOrigin = "center center";
        interval = setInterval(() => {
          el.style.transform = toggled ? "scale(1)" : "scale(1.08)";
          toggled = !toggled;
        }, 300);
        timer = setTimeout(() => { cleanup(); onDone(); }, 5000);
        break;
      }

      case "black_screen":
        timer = setTimeout(() => onDone(), 4000);
        break;

      case "police": {
        let phase = 0;
        interval = setInterval(() => {
          el.style.filter = phase % 2 === 0
            ? "hue-rotate(0deg) saturate(3) brightness(1.2)"
            : "hue-rotate(240deg) saturate(3) brightness(1.2)";
          phase++;
        }, 250);
        timer = setTimeout(() => { cleanup(); onDone(); }, 4000);
        break;
      }

      case "strobe": {
        let on = false;
        interval = setInterval(() => {
          el.style.filter = on ? "" : "brightness(6) saturate(0)";
          on = !on;
        }, 80);
        timer = setTimeout(() => { cleanup(); onDone(); }, 3000);
        break;
      }

      case "fake_ban":
        setCountdown(5);
        interval = setInterval(() => setCountdown((c) => c - 1), 1000);
        timer = setTimeout(() => { cleanup(); onDone(); }, 5000);
        break;

      case "matrix": {
        const canvas = canvasRef.current;
        if (!canvas) { timer = setTimeout(onDone, 5000); break; }
        const ctx = canvas.getContext("2d")!;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*アイウエオカキクケコ";
        const cols = Math.floor(canvas.width / 14);
        const drops: number[] = Array(cols).fill(1);
        const raf = { id: 0 };
        const draw = () => {
          ctx.fillStyle = "rgba(0,0,0,0.05)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = "#0f0";
          ctx.font = "14px monospace";
          for (let i = 0; i < drops.length; i++) {
            ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * 14, drops[i] * 14);
            if (drops[i] * 14 > canvas.height && Math.random() > 0.975) drops[i] = 0;
            drops[i]++;
          }
          raf.id = requestAnimationFrame(draw);
        };
        raf.id = requestAnimationFrame(draw);
        timer = setTimeout(() => { cancelAnimationFrame(raf.id); cleanup(); onDone(); }, 5000);
        break;
      }

      case "explosion": {
        const canvas = canvasRef.current;
        if (!canvas) { timer = setTimeout(onDone, 4000); break; }
        const ctx = canvas.getContext("2d")!;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const colors = ["#ff4500","#ffd700","#ff6b6b","#ff8c00","#ffff00","#ff1493","#00ff7f"];
        const particles = Array.from({ length: 200 }, () => {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 8;
          return { x: canvas.width / 2, y: canvas.height / 2, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 3, r: 2 + Math.random() * 4, color: colors[Math.floor(Math.random() * colors.length)], life: 1 };
        });
        const raf = { id: 0 };
        const draw = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          let alive = false;
          for (const p of particles) {
            if (p.life <= 0) continue;
            alive = true;
            p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.015;
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
          }
          ctx.globalAlpha = 1;
          if (alive) raf.id = requestAnimationFrame(draw); else onDone();
        };
        raf.id = requestAnimationFrame(draw);
        timer = setTimeout(() => { cancelAnimationFrame(raf.id); cleanup(); onDone(); }, 6000);
        break;
      }

      case "rain": {
        const canvas = canvasRef.current;
        if (!canvas) { timer = setTimeout(onDone, 5000); break; }
        const ctx = canvas.getContext("2d")!;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const drops = Array.from({ length: 200 }, () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, speed: 8 + Math.random() * 10, len: 15 + Math.random() * 30 }));
        const raf = { id: 0 };
        const draw = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = "rgba(150,200,255,0.7)";
          ctx.lineWidth = 1;
          for (const d of drops) {
            ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 2, d.y + d.len); ctx.stroke();
            d.y += d.speed;
            if (d.y > canvas.height) { d.y = -d.len; d.x = Math.random() * canvas.width; }
          }
          raf.id = requestAnimationFrame(draw);
        };
        raf.id = requestAnimationFrame(draw);
        timer = setTimeout(() => { cancelAnimationFrame(raf.id); cleanup(); onDone(); }, 5000);
        break;
      }

      case "confetti": {
        const canvas = canvasRef.current;
        if (!canvas) { timer = setTimeout(onDone, 5000); break; }
        const ctx = canvas.getContext("2d")!;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const colors = ["#ff6b6b","#ffd700","#5aa9e6","#00ff7f","#ff69b4","#da70d6"];
        const pieces = Array.from({ length: 150 }, () => ({
          x: Math.random() * canvas.width, y: -20,
          vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          w: 6 + Math.random() * 8, h: 3 + Math.random() * 5,
          rot: Math.random() * Math.PI * 2, rotV: (Math.random() - 0.5) * 0.2,
        }));
        const raf = { id: 0 };
        const draw = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          for (const p of pieces) {
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
            ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
            p.x += p.vx; p.y += p.vy; p.rot += p.rotV;
            if (p.y > canvas.height) { p.y = -20; p.x = Math.random() * canvas.width; }
          }
          raf.id = requestAnimationFrame(draw);
        };
        raf.id = requestAnimationFrame(draw);
        timer = setTimeout(() => { cancelAnimationFrame(raf.id); cleanup(); onDone(); }, 5000);
        break;
      }

      case "hypnosis": {
        const canvas = canvasRef.current;
        if (!canvas) { timer = setTimeout(onDone, 6000); break; }
        const ctx = canvas.getContext("2d")!;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        let angle = 0;
        const raf = { id: 0 };
        const draw = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = "rgba(0,0,0,0.85)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          const cx = canvas.width / 2, cy = canvas.height / 2;
          for (let i = 0; i < 80; i++) {
            const r = i * 7;
            const a = angle + i * 0.2;
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r;
            const hue = (i * 4 + angle * 30) % 360;
            ctx.beginPath(); ctx.arc(x, y, 6 - i * 0.04, 0, Math.PI * 2);
            ctx.fillStyle = `hsl(${hue},100%,60%)`; ctx.fill();
          }
          angle += 0.04;
          raf.id = requestAnimationFrame(draw);
        };
        raf.id = requestAnimationFrame(draw);
        timer = setTimeout(() => { cancelAnimationFrame(raf.id); cleanup(); onDone(); }, 6000);
        break;
      }

      case "disco":
        timer = setTimeout(() => { cleanup(); onDone(); }, 4000);
        break;

      case "hacker":
      case "rick_roll":
        timer = setTimeout(() => { cleanup(); onDone(); }, 6000);
        break;

      default:
        timer = setTimeout(() => { cleanup(); onDone(); }, 5000);
    }

    return cleanup;
  }, [effect, onDone]);

  if (!effect) return null;

  // Black screen overlay
  if (effect === "black_screen") {
    return <div className="fixed inset-0 z-[9999] bg-black" />;
  }

  // Strobe — handled via CSS filter, no overlay needed (effect applied to documentElement)
  if (effect === "strobe" || effect === "police" || effect === "earthquake" || effect === "upside_down" || effect === "ghost" || effect === "spin" || effect === "zoom_pulse") {
    return null;
  }

  // Fake ban
  if (effect === "fake_ban") {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90">
        <div className="max-w-lg w-full mx-4 rounded-xl border-2 border-red-600 bg-zinc-900 p-8 text-center shadow-2xl">
          <div className="text-7xl mb-4">🔨</div>
          <h1 className="text-3xl font-black text-red-500 mb-2">YOU HAVE BEEN BANNED</h1>
          <p className="text-muted-foreground mb-4">
            You have been permanently banned from Oogly Chat for violating our community guidelines.
          </p>
          <div className="bg-zinc-800 rounded-lg p-3 text-left text-sm mb-4 font-mono space-y-1">
            <p className="text-red-400">Reason: Being too awesome for this chat</p>
            <p className="text-muted-foreground">Duration: Permanent</p>
            <p className="text-muted-foreground">Appeal: lol no 😂</p>
          </div>
          <p className="text-xs text-muted-foreground">This is a joke! Screen will clear in {countdown}s…</p>
          <div className="mt-3 h-1 bg-zinc-700 rounded-full overflow-hidden">
            <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${(countdown / 5) * 100}%` }} />
          </div>
        </div>
      </div>
    );
  }

  // Disco
  if (effect === "disco") {
    return (
      <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
        <div className="disco-flash" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-9xl animate-bounce drop-shadow-2xl">🕺</div>
        </div>
      </div>
    );
  }

  // Hacker
  if (effect === "hacker") {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col p-6 font-mono text-green-400 overflow-hidden">
        <div className="text-xl font-bold mb-4 animate-pulse">⚠ SYSTEM BREACH DETECTED ⚠</div>
        <div className="space-y-1 text-sm opacity-90">
          {[
            "Initializing remote access protocol...",
            "Bypassing firewall... [████████████] 100%",
            "Extracting user credentials...",
            "root@oogly:~$ cat /etc/shadow | grep password",
            "Uploading payload... [████████████] DONE",
            "Installing ransomware... success",
            "Encrypting your files with AES-256...",
            "Your IP: 192.168.1.1 (logged)",
            "Sending data to remote server...",
            "",
            "HACKED BY: anonymous 😈",
            "Just kidding lol 💀",
          ].map((line, i) => (
            <div key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>{line || <br />}</div>
          ))}
        </div>
      </div>
    );
  }

  // Rick Roll
  if (effect === "rick_roll") {
    return (
      <div className="fixed inset-0 z-[9999] bg-zinc-900 flex flex-col items-center justify-center text-center p-8">
        <div className="text-8xl mb-6 animate-bounce">🎵</div>
        <div className="text-4xl font-black text-primary mb-4">Never Gonna Give You Up</div>
        <div className="text-xl text-muted-foreground mb-6">Rick Astley — 1987</div>
        <div className="text-lg space-y-2 text-foreground/80 max-w-md">
          <p>🎤 Never gonna give you up</p>
          <p>🎤 Never gonna let you down</p>
          <p>🎤 Never gonna run around and desert you</p>
          <p>🎤 Never gonna make you cry</p>
          <p>🎤 Never gonna say goodbye</p>
        </div>
        <div className="mt-8 text-sm text-muted-foreground animate-pulse">You just got Rick Rolled by your admin 💀</div>
      </div>
    );
  }

  // Canvas-based effects
  return (
    <canvas ref={canvasRef} className="fixed inset-0 z-[9999] pointer-events-none" />
  );
}
