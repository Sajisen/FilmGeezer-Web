import { useEffect, useRef } from "react";

type CelebrationShape = "circle" | "diamond" | "ribbon";

type CelebrationColor = {
  red: number;
  green: number;
  blue: number;
};

type CelebrationParticle = {
  color: CelebrationColor;
  delay: number;
  gravity: number;
  initialRotation: number;
  life: number;
  rotationSpeed: number;
  shape: CelebrationShape;
  size: number;
  swayAmplitude: number;
  swayFrequency: number;
  swayPhase: number;
  velocityX: number;
  velocityY: number;
  x: number;
  y: number;
};

const CELEBRATION_COLORS: CelebrationColor[] = [
  { red: 56, green: 189, blue: 248 },
  { red: 14, green: 165, blue: 233 },
  { red: 34, green: 211, blue: 238 },
  { red: 96, green: 165, blue: 250 },
  { red: 129, green: 140, blue: 248 },
  { red: 219, green: 234, blue: 254 },
];

function randomBetween(minimum: number, maximum: number) {
  return minimum + Math.random() * (maximum - minimum);
}

function pickShape(index: number): CelebrationShape {
  if (index % 9 === 0) {
    return "circle";
  }

  if (index % 5 === 0) {
    return "diamond";
  }

  return "ribbon";
}

function createBurstParticles(width: number, height: number) {
  const isCompact = width < 640;
  const cardWidth = Math.min(width - 24, isCompact ? 352 : 672);
  const cardHeight = Math.min(height * 0.72, isCompact ? 560 : 610);
  const burstCount = isCompact ? 46 : width < 1024 ? 66 : 82;
  const topDriftCount = isCompact ? 8 : 14;
  const lowerEdge = Math.min(
    height - 40,
    height / 2 + cardHeight * (isCompact ? 0.34 : 0.38),
  );
  const leftOrigin = Math.max(12, (width - cardWidth) / 2 - 34);
  const rightOrigin = Math.min(width - 12, (width + cardWidth) / 2 + 34);
  const particles: CelebrationParticle[] = [];

  for (let index = 0; index < burstCount; index += 1) {
    const launchesFromLeft = index % 2 === 0;
    const speed = randomBetween(
      isCompact ? 250 : 310,
      isCompact ? 430 : 590,
    );
    const launchAngle = randomBetween(-1.34, -0.72);
    const horizontalVelocity = Math.cos(launchAngle) * speed;
    const verticalVelocity = Math.sin(launchAngle) * speed;

    particles.push({
      color:
        CELEBRATION_COLORS[index % CELEBRATION_COLORS.length],
      delay: randomBetween(0.08, 0.48),
      gravity: randomBetween(isCompact ? 520 : 560, isCompact ? 760 : 840),
      initialRotation: randomBetween(0, Math.PI * 2),
      life: randomBetween(2.75, 4.05),
      rotationSpeed: randomBetween(-9.5, 9.5),
      shape: pickShape(index),
      size: randomBetween(isCompact ? 3.2 : 3.8, isCompact ? 6.4 : 7.6),
      swayAmplitude: randomBetween(3, isCompact ? 10 : 16),
      swayFrequency: randomBetween(3.2, 6.4),
      swayPhase: randomBetween(0, Math.PI * 2),
      velocityX: launchesFromLeft
        ? horizontalVelocity
        : -horizontalVelocity,
      velocityY: verticalVelocity,
      x: launchesFromLeft
        ? leftOrigin + randomBetween(-8, 10)
        : rightOrigin + randomBetween(-10, 8),
      y: lowerEdge + randomBetween(-18, 18),
    });
  }

  for (let index = 0; index < topDriftCount; index += 1) {
    particles.push({
      color:
        CELEBRATION_COLORS[
          (index + burstCount) % CELEBRATION_COLORS.length
        ],
      delay: randomBetween(0.22, 0.82),
      gravity: randomBetween(80, 145),
      initialRotation: randomBetween(0, Math.PI * 2),
      life: randomBetween(3.2, 4.45),
      rotationSpeed: randomBetween(-5.5, 5.5),
      shape: pickShape(index + burstCount),
      size: randomBetween(isCompact ? 2.8 : 3.4, isCompact ? 5.2 : 6.3),
      swayAmplitude: randomBetween(8, isCompact ? 18 : 28),
      swayFrequency: randomBetween(1.4, 2.7),
      swayPhase: randomBetween(0, Math.PI * 2),
      velocityX: randomBetween(-24, 24),
      velocityY: randomBetween(42, 96),
      x: randomBetween(width * 0.08, width * 0.92),
      y: randomBetween(-42, -10),
    });
  }

  return particles;
}

function getParticleOpacity(progress: number) {
  const fadeIn = Math.min(1, progress / 0.08);
  const fadeOut =
    progress < 0.72 ? 1 : Math.max(0, (1 - progress) / 0.28);

  return fadeIn * fadeOut;
}

function drawParticle(
  context: CanvasRenderingContext2D,
  particle: CelebrationParticle,
  elapsed: number,
) {
  const localTime = elapsed - particle.delay;

  if (localTime <= 0 || localTime >= particle.life) {
    return;
  }

  const progress = localTime / particle.life;
  const horizontalDrift =
    Math.sin(
      particle.swayPhase + localTime * particle.swayFrequency,
    ) *
    particle.swayAmplitude *
    Math.min(1, localTime * 2.4);
  const x = particle.x + particle.velocityX * localTime + horizontalDrift;
  const y =
    particle.y +
    particle.velocityY * localTime +
    0.5 * particle.gravity * localTime * localTime;
  const rotation =
    particle.initialRotation + particle.rotationSpeed * localTime;
  const opacity = getParticleOpacity(progress) * 0.9;

  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.globalAlpha = opacity;
  context.fillStyle = `rgb(${particle.color.red} ${particle.color.green} ${particle.color.blue})`;
  context.shadowBlur = particle.shape === "circle" ? 7 : 4;
  context.shadowColor = `rgb(${particle.color.red} ${particle.color.green} ${particle.color.blue} / 0.45)`;

  if (particle.shape === "circle") {
    context.beginPath();
    context.arc(0, 0, particle.size * 0.55, 0, Math.PI * 2);
    context.fill();
  } else if (particle.shape === "diamond") {
    const halfSize = particle.size * 0.65;
    context.beginPath();
    context.moveTo(0, -halfSize);
    context.lineTo(halfSize, 0);
    context.lineTo(0, halfSize);
    context.lineTo(-halfSize, 0);
    context.closePath();
    context.fill();
  } else {
    const flutter = 0.28 + Math.abs(Math.cos(rotation * 0.72)) * 0.72;
    context.scale(flutter, 1);
    context.beginPath();
    context.roundRect(
      -particle.size * 0.48,
      -particle.size * 0.9,
      particle.size * 0.96,
      particle.size * 1.8,
      Math.max(1, particle.size * 0.18),
    );
    context.fill();
  }

  context.restore();
}

export default function WelcomeCelebrationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    if (motionPreference.matches) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const particles = createBurstParticles(width, height);
    const startedAt = performance.now();
    const maximumDuration = 4.7;
    let animationFrameId = 0;
    let stopped = false;

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.globalCompositeOperation = "screen";

    function stopAnimation() {
      stopped = true;
      window.cancelAnimationFrame(animationFrameId);
      context.clearRect(0, 0, width, height);
    }

    function handleMotionPreferenceChange(event: MediaQueryListEvent) {
      if (event.matches) {
        stopAnimation();
      }
    }

    function renderFrame(timestamp: number) {
      if (stopped) {
        return;
      }

      const elapsed = (timestamp - startedAt) / 1000;
      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        drawParticle(context, particle, elapsed);
      }

      if (elapsed < maximumDuration) {
        animationFrameId = window.requestAnimationFrame(renderFrame);
      } else {
        context.clearRect(0, 0, width, height);
      }
    }

    motionPreference.addEventListener(
      "change",
      handleMotionPreferenceChange,
    );
    animationFrameId = window.requestAnimationFrame(renderFrame);

    return () => {
      stopped = true;
      window.cancelAnimationFrame(animationFrameId);
      motionPreference.removeEventListener(
        "change",
        handleMotionPreferenceChange,
      );
      context.clearRect(0, 0, width, height);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="welcome-celebration-canvas"
      aria-hidden="true"
    />
  );
}
