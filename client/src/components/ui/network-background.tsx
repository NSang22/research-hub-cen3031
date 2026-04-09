import { useEffect, useRef, useCallback } from "react";

// ── CONFIG ──────────────────────────────────────────────────────
const NODE_COUNT = 40;
const CONNECTION_DISTANCE = 180;
const MOUSE_RADIUS = 220;
const BASE_SPEED = 0.3;
const MOUSE_REPEL_FORCE = 0.04;
const PULSE_CHANCE = 0.002; // chance per frame a connection "pulses"

// ── TYPES ───────────────────────────────────────────────────────
interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  type: "student" | "lab" | "neutral";
}

interface Pulse {
  fromIdx: number;
  toIdx: number;
  progress: number;
  speed: number;
}

// Color palette: CMYK blue 100 60 0 20 to RGB(0,82,204) and variants
const COLORS = {
  student: { r: 0, g: 82, b: 204 },
  lab: { r: 40, g: 110, b: 220 },
  neutral: { r: 120, g: 160, b: 230 },
  pulse: { r: 0, g: 100, b: 220 },
};

// ── NETWORK CANVAS ──────────────────────────────────────────────
export function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const pulsesRef = useRef<Pulse[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const animRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0 });

  const initNodes = useCallback((w: number, h: number) => {
    const nodes: Node[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      const type =
        i < NODE_COUNT * 0.4
          ? "student"
          : i < NODE_COUNT * 0.7
            ? "lab"
            : "neutral";
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * BASE_SPEED,
        vy: (Math.random() - 0.5) * BASE_SPEED,
        radius: type === "lab" ? 3.5 : type === "student" ? 2.5 : 2,
        baseAlpha: 0.35 + Math.random() * 0.35,
        type,
      });
    }
    nodesRef.current = nodes;
    pulsesRef.current = [];
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };
      if (nodesRef.current.length === 0) initNodes(w, h);
    };

    const onMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("mouseleave", onMouseLeave);

    // ── ANIMATION LOOP ────────────────────────────────────────
    const draw = () => {
      const { w, h } = sizeRef.current;
      const nodes = nodesRef.current;
      const pulses = pulsesRef.current;
      const mouse = mouseRef.current;

      ctx.clearRect(0, 0, w, h);

      // Update positions
      for (const node of nodes) {
        // Mouse repulsion
        const dx = node.x - mouse.x;
        const dy = node.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = (1 - dist / MOUSE_RADIUS) * MOUSE_REPEL_FORCE;
          node.vx += (dx / dist) * force;
          node.vy += (dy / dist) * force;
        }

        // Damping
        node.vx *= 0.998;
        node.vy *= 0.998;

        // Clamp speed
        const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
        if (speed > BASE_SPEED * 3) {
          node.vx = (node.vx / speed) * BASE_SPEED * 3;
          node.vy = (node.vy / speed) * BASE_SPEED * 3;
        }

        node.x += node.vx;
        node.y += node.vy;

        // Wrap edges with padding
        if (node.x < -40) node.x = w + 40;
        if (node.x > w + 40) node.x = -40;
        if (node.y < -40) node.y = h + 40;
        if (node.y > h + 40) node.y = -40;
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECTION_DISTANCE) {
            const alpha = (1 - dist / CONNECTION_DISTANCE) * 0.15;

            // Color connection based on types
            const isCrossType =
              (a.type === "student" && b.type === "lab") ||
              (a.type === "lab" && b.type === "student");
            const col = isCrossType ? COLORS.student : COLORS.neutral;

            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(${col.r},${col.g},${col.b},${alpha})`;
            ctx.lineWidth = isCrossType ? 1.2 : 0.6;
            ctx.stroke();

            // Maybe spawn a pulse on student↔lab connections
            if (isCrossType && Math.random() < PULSE_CHANCE) {
              pulses.push({
                fromIdx: i,
                toIdx: j,
                progress: 0,
                speed: 0.008 + Math.random() * 0.012,
              });
            }
          }
        }
      }

      // Draw pulses (data traveling along connections)
      for (let p = pulses.length - 1; p >= 0; p--) {
        const pulse = pulses[p];
        pulse.progress += pulse.speed;
        if (pulse.progress > 1) {
          pulses.splice(p, 1);
          continue;
        }

        const a = nodes[pulse.fromIdx];
        const b = nodes[pulse.toIdx];
        const px = a.x + (b.x - a.x) * pulse.progress;
        const py = a.y + (b.y - a.y) * pulse.progress;
        const pulseAlpha = Math.sin(pulse.progress * Math.PI) * 0.8;

        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${COLORS.pulse.r},${COLORS.pulse.g},${COLORS.pulse.b},${pulseAlpha})`;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${COLORS.pulse.r},${COLORS.pulse.g},${COLORS.pulse.b},${pulseAlpha * 0.25})`;
        ctx.fill();
      }

      // Draw nodes
      for (const node of nodes) {
        const col = COLORS[node.type];

        // Glow
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${node.baseAlpha * 0.08})`;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${node.baseAlpha})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [initNodes]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 w-full h-full pointer-events-none"
    />
  );
}
