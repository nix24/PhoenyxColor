<script lang="ts">
	import { cn } from "$lib/utils/cn";

	let { 
		children, 
		class: className = "", 
		hoverEffect = false,
		intensity = "medium",
		...rest 
	} = $props();

	const baseStyles = "glass-panel rounded-xl transition-all duration-300 relative overflow-hidden";
	
	const intensities = {
		low: "bg-opacity-40 backdrop-blur-md",
		medium: "bg-opacity-60 backdrop-blur-xl",
		high: "bg-opacity-80 backdrop-blur-2xl"
	};

	const hoverStyles = hoverEffect 
		? "hover:bg-opacity-70 hover:border-white/20 hover:shadow-lg hover:-translate-y-1 group" 
		: "";

</script>

<div 
	class={cn(baseStyles, intensities[intensity as keyof typeof intensities], hoverStyles, className)}
	{...rest}
>
	<!-- Inner Glow Gradient (Top Left) -->
	<div class="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent opacity-50 pointer-events-none"></div>
	
	<!-- Content -->
	<div class="relative z-10 h-full">
		{@render children()}
	</div>
</div>
