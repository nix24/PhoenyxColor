// Performance optimization utilities for PhoenyxColor
import { toast } from "svelte-sonner";

export interface ImageOptimizationOptions {
	maxWidth?: number;
	maxHeight?: number;
	quality?: number;
	format?: "jpeg" | "png" | "webp";
}

export interface ThumbnailOptions {
	width: number;
	height: number;
	quality?: number;
}

export class PerformanceService {
	private static instance: PerformanceService;
	private imageCache = new Map<string, string>();
	private thumbnailCache = new Map<string, string>();

	static getInstance(): PerformanceService {
		if (!PerformanceService.instance) {
			PerformanceService.instance = new PerformanceService();
		}
		return PerformanceService.instance;
	}

	/**
	 * Optimize image for better performance
	 */
	async optimizeImage(
		file: File,
		options: ImageOptimizationOptions = {}
	): Promise<{ optimized: File; thumbnail: string }> {
		const { maxWidth = 1920, maxHeight = 1080, quality = 0.92, format = "jpeg" } = options;

		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => {
				try {
					// Calculate new dimensions while maintaining aspect ratio
					const { width: newWidth, height: newHeight } = this.calculateOptimalDimensions(
						img.width,
						img.height,
						maxWidth,
						maxHeight
					);

					// Create canvas for optimization with high quality rendering
					const canvas = document.createElement("canvas");
					const ctx = canvas.getContext("2d")!;
					canvas.width = newWidth;
					canvas.height = newHeight;

					// Enable high-quality image rendering
					ctx.imageSmoothingEnabled = true;
					ctx.imageSmoothingQuality = "high";

					// Draw and compress image with better quality
					ctx.drawImage(img, 0, 0, newWidth, newHeight);

					// Convert to blob with higher quality
					canvas.toBlob(
						(blob) => {
							if (blob) {
								const optimizedFile = new File([blob], file.name, {
									type: `image/${format}`,
									lastModified: Date.now(),
								});

								// Generate high-quality thumbnail
								const thumbnail = this.generateThumbnail(canvas, {
									width: 256,
									height: 256,
									quality: 0.9,
								});

								resolve({ optimized: optimizedFile, thumbnail });
							} else {
								reject(new Error("Failed to optimize image"));
							}
						},
						`image/${format}`,
						quality
					);
				} catch (error) {
					reject(error);
				}
			};

			img.onerror = () => reject(new Error("Failed to load image"));
			img.src = URL.createObjectURL(file);
		});
	}

	/**
	 * Generate thumbnail for an image
	 */
	generateThumbnail(
		source: HTMLImageElement | HTMLCanvasElement,
		options: ThumbnailOptions
	): string {
		const { width, height, quality = 0.9 } = options; // Higher default quality

		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d")!;
		canvas.width = width;
		canvas.height = height;

		// Enable high-quality rendering
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = "high";

		// Calculate dimensions to maintain aspect ratio
		const sourceWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
		const sourceHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height;

		const { width: drawWidth, height: drawHeight } = this.calculateOptimalDimensions(
			sourceWidth,
			sourceHeight,
			width,
			height
		);

		// Center the image
		const x = (width - drawWidth) / 2;
		const y = (height - drawHeight) / 2;

		// Fill background with a neutral color
		ctx.fillStyle = "#f8f8f8";
		ctx.fillRect(0, 0, width, height);

		// Draw image with high quality
		ctx.drawImage(source, x, y, drawWidth, drawHeight);

		return canvas.toDataURL("image/jpeg", quality);
	}

	/**
	 * Calculate optimal dimensions while maintaining aspect ratio
	 */
	private calculateOptimalDimensions(
		originalWidth: number,
		originalHeight: number,
		maxWidth: number,
		maxHeight: number
	): { width: number; height: number } {
		const aspectRatio = originalWidth / originalHeight;

		let width = originalWidth;
		let height = originalHeight;

		// Scale down if necessary
		if (width > maxWidth) {
			width = maxWidth;
			height = width / aspectRatio;
		}

		if (height > maxHeight) {
			height = maxHeight;
			width = height * aspectRatio;
		}

		return { width: Math.round(width), height: Math.round(height) };
	}

	/**
	 * Lazy load image with placeholder
	 */
	async lazyLoadImage(src: string, placeholder?: string): Promise<string> {
		// Check cache first
		if (this.imageCache.has(src)) {
			return this.imageCache.get(src)!;
		}

		return new Promise((resolve, reject) => {
			const img = new Image();

			img.onload = () => {
				// Cache the loaded image
				this.imageCache.set(src, src);
				resolve(src);
			};

			img.onerror = () => {
				if (placeholder) {
					resolve(placeholder);
				} else {
					reject(new Error("Failed to load image"));
				}
			};

			img.src = src;
		});
	}

	/**
	 * Preload critical images
	 */
	async preloadImages(urls: string[]): Promise<void> {
		const promises = urls.map((url) => this.lazyLoadImage(url));

		try {
			await Promise.allSettled(promises);
		} catch (error) {
			console.warn("Some images failed to preload:", error);
		}
	}

	/**
	 * Debounce function for performance optimization
	 */
	debounce<T extends (...args: any[]) => any>(
		func: T,
		wait: number
	): (...args: Parameters<T>) => void {
		let timeout: number;

		return (...args: Parameters<T>) => {
			clearTimeout(timeout);
			timeout = window.setTimeout(() => func(...args), wait);
		};
	}

	/**
	 * Throttle function for performance optimization
	 */
	throttle<T extends (...args: any[]) => any>(
		func: T,
		limit: number
	): (...args: Parameters<T>) => void {
		let inThrottle: boolean;

		return (...args: Parameters<T>) => {
			if (!inThrottle) {
				func(...args);
				inThrottle = true;
				setTimeout(() => (inThrottle = false), limit);
			}
		};
	}

	/**
	 * Measure and log performance metrics
	 */
	measurePerformance<T>(name: string, fn: () => T): T {
		const start = performance.now();
		const result = fn();
		const end = performance.now();

		console.log(`Performance: ${name} took ${end - start} milliseconds`);
		return result;
	}

	/**
	 * Clear image caches to free memory
	 */
	clearCaches(): void {
		this.imageCache.clear();
		this.thumbnailCache.clear();
		toast.info("Image caches cleared");
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { imageCache: number; thumbnailCache: number } {
		return {
			imageCache: this.imageCache.size,
			thumbnailCache: this.thumbnailCache.size,
		};
	}

	/**
	 * Optimize canvas rendering
	 */
	optimizeCanvas(canvas: HTMLCanvasElement): void {
		const ctx = canvas.getContext("2d");
		if (ctx) {
			// Enable image smoothing for better quality
			ctx.imageSmoothingEnabled = true;
			ctx.imageSmoothingQuality = "high";

			// Set optimal composite operation
			ctx.globalCompositeOperation = "source-over";
		}
	}

	/**
	 * Check if WebP is supported
	 */
	isWebPSupported(): boolean {
		const canvas = document.createElement("canvas");
		canvas.width = 1;
		canvas.height = 1;
		return canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;
	}

	/**
	 * Get optimal image format based on browser support
	 */
	getOptimalImageFormat(): "webp" | "jpeg" {
		return this.isWebPSupported() ? "webp" : "jpeg";
	}

	/**
	 * Compress image data URL
	 */
	compressDataURL(dataURL: string, quality: number = 0.8): string {
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d")!;
		const img = new Image();

		img.onload = () => {
			canvas.width = img.width;
			canvas.height = img.height;
			ctx.drawImage(img, 0, 0);
		};

		img.src = dataURL;
		return canvas.toDataURL("image/jpeg", quality);
	}

	/**
	 * Monitor memory usage (if available)
	 */
	getMemoryUsage(): { used?: number; total?: number; percentage?: number } {
		if ("memory" in performance) {
			const memory = (performance as any).memory;
			return {
				used: memory.usedJSHeapSize,
				total: memory.totalJSHeapSize,
				percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
			};
		}
		return {};
	}
}

// Export singleton instance
export const performanceService = PerformanceService.getInstance();
