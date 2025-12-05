<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { app } from "$lib/stores/root.svelte";

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null;
	let animationFrame: number;
	let particles: Particle[] = [];

	// Parallax state
	let mouseX = 0;
	let mouseY = 0;
	let targetX = 0;
	let targetY = 0;

	interface Particle {
		x: number;
		y: number;
		size: number;
		speedX: number;
		speedY: number;
		opacity: number;
		symbol: string;
		rotation: number;
		rotationSpeed: number;
	}

	const SYMBOLS = ["○", "×", "□", "△", "+", "●"];

	function initParticles() {
		particles = [];
		const count = 30;
		for (let i = 0; i < count; i++) {
			particles.push(createParticle());
		}
	}

	function createParticle(): Particle {
		return {
			x: Math.random() * window.innerWidth,
			y: Math.random() * window.innerHeight,
			size: Math.random() * 20 + 10,
			speedX: (Math.random() - 0.5) * 0.5,
			speedY: (Math.random() - 0.5) * 0.5,
			opacity: Math.random() * 0.3 + 0.1,
			symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)] ?? "○",
			rotation: Math.random() * Math.PI * 2,
			rotationSpeed: (Math.random() - 0.5) * 0.02,
		};
	}

	function animate() {
		if (!ctx || !canvas) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Smooth parallax
		targetX += (mouseX - targetX) * 0.05;
		targetY += (mouseY - targetY) * 0.05;

		// Draw gradient background based on theme
		const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
		gradient.addColorStop(0, app.theme.current.background); // Use theme background
		// Mix in some primary/secondary for depth
		// Note: Canvas gradient doesn't support oklch directly in all browsers yet,
		// but modern browsers do. If issues arise, we might need computed styles.
		// For safety, we rely on CSS background for the main fill and use canvas for particles.

		ctx.fillStyle = "transparent"; // Let CSS handle the base color
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		particles.forEach((p) => {
			p.x += p.speedX + targetX * p.size * 0.001;
			p.y += p.speedY + targetY * p.size * 0.001;
			p.rotation += p.rotationSpeed;

			// Wrap around screen
			if (p.x < -50) p.x = canvas.width + 50;
			if (p.x > canvas.width + 50) p.x = -50;
			if (p.y < -50) p.y = canvas.height + 50;
			if (p.y > canvas.height + 50) p.y = -50;

			if (ctx) {
				ctx.save();
				ctx.translate(p.x, p.y);
				ctx.rotate(p.rotation);
				ctx.globalAlpha = p.opacity;
				ctx.fillStyle = app.theme.current.primary; // Use theme primary color
				ctx.font = `${p.size}px "Montserrat"`;
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText(p.symbol, 0, 0);
				ctx.restore();
			}
		});

		animationFrame = requestAnimationFrame(animate);
	}

	function handleResize() {
		if (canvas) {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			initParticles();
		}
	}

	function handleMouseMove(e: MouseEvent) {
		mouseX = e.clientX - window.innerWidth / 2;
		mouseY = e.clientY - window.innerHeight / 2;
	}

	// Gyroscope support for mobile
	function handleOrientation(e: DeviceOrientationEvent) {
		if (e.gamma && e.beta) {
			mouseX = e.gamma * 5;
			mouseY = e.beta * 5;
		}
	}

	onMount(() => {
		ctx = canvas.getContext("2d");
		handleResize();
		window.addEventListener("resize", handleResize);
		window.addEventListener("mousemove", handleMouseMove);
		if (window.DeviceOrientationEvent) {
			window.addEventListener("deviceorientation", handleOrientation);
		}
		animate();
	});

	onDestroy(() => {
		if (typeof window !== "undefined") {
			window.removeEventListener("resize", handleResize);
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("deviceorientation", handleOrientation);
			cancelAnimationFrame(animationFrame);
		}
	});
</script>

<canvas
	bind:this={canvas}
	class="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-60 mix-blend-screen"
></canvas>

<div
	class="fixed inset-0 pointer-events-none z-0 bg-linear-to-br from-transparent via-transparent to-black/40"
></div>
