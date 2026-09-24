// Performance optimization utilities for PhoenyxColor
import { toast } from "svelte-sonner";

interface ImageOptimizationOptions {
	maxWidth?: number;
	maxHeight?: number;
	quality?: number;
	format?: "jpeg" | "png" | "webp";
}

interface ThumbnailOptions {
	width: number;
	height: number;
	quality?: number;
}

/** Pixel dimensions of a rendered or resized image. */
interface PixelDimensions {
	width: number;
	height: number;
}

class PerformanceService {
	private static instance: PerformanceService;
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
			const objectUrl = URL.createObjectURL(file);
			img.onload = () => {
				URL.revokeObjectURL(objectUrl);
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
					canvas.width = newWidth;
					canvas.height = newHeight;
					const ctx = canvas.getContext("2d");

					// Enable high-quality image rendering
					if (!ctx) {
						throw new Error("Failed to create canvas context");
					}
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

			img.onerror = () => {
				URL.revokeObjectURL(objectUrl);
				reject(new Error("Failed to load image"));
			};
			img.src = objectUrl;
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
		const ctx = canvas.getContext("2d");
		canvas.width = width;
		canvas.height = height;

		// Enable high-quality rendering
		if (!ctx) {
			toast.error("Failed to create canvas context");
			return "";
		}
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
	): PixelDimensions {
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
}

export const performanceService = PerformanceService.getInstance();
