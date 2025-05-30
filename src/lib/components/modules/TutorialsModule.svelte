<script lang="ts">
	import { appStore } from "$lib/stores/app.svelte";
	import Icon from "@iconify/svelte";
	import { toast } from "svelte-sonner";

	interface TutorialSection {
		id: string;
		title: string;
		description: string;
		icon: string;
		difficulty: "beginner" | "intermediate" | "advanced";
		estimatedTime: string;
		steps: TutorialStep[];
	}

	interface TutorialStep {
		title: string;
		content: string;
		image?: string;
		tips?: string[];
		action?: string;
	}

	const tutorials: TutorialSection[] = [
		{
			id: "getting-started",
			title: "Getting Started",
			description: "Learn the basics of PhoenyxColor and navigate the interface",
			icon: "material-symbols:play-circle-outline",
			difficulty: "beginner",
			estimatedTime: "5 minutes",
			steps: [
				{
					title: "Welcome to PhoenyxColor",
					content:
						"PhoenyxColor is a powerful color workflow tool designed for digital artists. It helps you manage reference images, create color palettes, and generate beautiful gradients.",
					tips: [
						"Use the navigation tabs to switch between modules",
						"The eyedropper tool can pick colors from anywhere",
						"All your work is automatically saved locally",
					],
				},
				{
					title: "Navigation Overview",
					content:
						"The main navigation bar contains three core modules: References for managing reference images, Palettes for creating color schemes, and Gradients for generating smooth color transitions.",
					action: "Try clicking on different navigation tabs to explore each module",
				},
				{
					title: "Settings and Customization",
					content:
						"Access the Settings panel to customize your experience. You can change themes, adjust default values, and configure export preferences.",
					action: "Click the settings icon in the top-right corner to explore options",
				},
			],
		},
		{
			id: "references-module",
			title: "References Module",
			description: "Master reference image management and organization",
			icon: "material-symbols:image-outline",
			difficulty: "beginner",
			estimatedTime: "8 minutes",
			steps: [
				{
					title: "Adding Reference Images",
					content:
						'Upload reference images by clicking the "Add Reference" button or simply drag and drop files onto the canvas area. Supported formats include JPG, PNG, GIF, and WebP.',
					tips: [
						"You can upload multiple images at once",
						"Images are automatically resized to fit the canvas",
						"Original image quality is preserved",
					],
				},
				{
					title: "Manipulating References",
					content:
						"Each reference image can be moved, scaled, rotated, and adjusted for opacity. Use the controls in the reference panel or interact directly with images on the canvas.",
					action: "Try uploading an image and experimenting with the transformation controls",
				},
				{
					title: "Reference Boards",
					content:
						"Save your reference arrangements as boards for different projects. This allows you to quickly switch between different reference setups.",
					tips: [
						"Reference boards save image positions and transformations",
						"You can have multiple boards for different projects",
						"Boards can be exported and shared",
					],
				},
			],
		},
		{
			id: "palettes-module",
			title: "Palettes Module",
			description: "Create and manage color palettes like a pro",
			icon: "material-symbols:palette-outline",
			difficulty: "intermediate",
			estimatedTime: "10 minutes",
			steps: [
				{
					title: "Creating Your First Palette",
					content:
						"Start by creating a new palette with your desired number of color slots. You can add colors manually using the color picker or by entering hex values.",
					action: "Create a new palette and add a few colors",
				},
				{
					title: "Extracting Colors from Images",
					content:
						"Generate palettes automatically from reference images using advanced color extraction algorithms. Choose from different extraction methods for varied results.",
					tips: [
						"K-means clustering provides balanced color distribution",
						"Try different cluster counts for varied results",
						"Extracted colors can be fine-tuned manually",
					],
				},
				{
					title: "Palette Manipulation",
					content:
						"Apply time-of-day moods to shift palette atmosphere, or use the eyedropper to tint entire palettes with a selected color.",
					action: "Try applying different mood settings to see how they affect your palette",
				},
				{
					title: "Exporting Palettes",
					content:
						"Export your palettes in various formats including Adobe Swatch Exchange (.ase), Adobe Color (.aco), PNG images, or CSS code for web development.",
					tips: [
						"Choose the format that matches your workflow",
						"PNG exports include color values as text",
						"CSS exports are ready for web projects",
					],
				},
			],
		},
		{
			id: "gradients-module",
			title: "Gradients Module",
			description: "Generate stunning gradients for any project",
			icon: "material-symbols:gradient",
			difficulty: "intermediate",
			estimatedTime: "7 minutes",
			steps: [
				{
					title: "Gradient Types",
					content:
						"PhoenyxColor supports three gradient types: Linear (straight line), Radial (circular), and Angular (conical). Each type has specific controls for customization.",
					action: "Create gradients of each type to see the differences",
				},
				{
					title: "Managing Color Stops",
					content:
						"Add, remove, and position color stops to create complex gradients. Drag stops along the gradient bar to adjust their positions.",
					tips: [
						"Click on the gradient bar to add new stops",
						"Right-click stops to remove them",
						"Drag stops to reposition them",
					],
				},
				{
					title: "Gradient Controls",
					content:
						"Adjust gradient angle for linear gradients, or center position for radial gradients. Use the preview area to see changes in real-time.",
					action: "Experiment with different angles and center positions",
				},
				{
					title: "Exporting Gradients",
					content:
						"Export gradients as CSS code for web use, PNG images for design software, or SVG files for vector graphics.",
					tips: [
						"CSS exports include vendor prefixes",
						"PNG exports use your preferred resolution",
						"SVG exports are scalable and editable",
					],
				},
			],
		},
		{
			id: "advanced-features",
			title: "Advanced Features",
			description: "Unlock the full potential of PhoenyxColor",
			icon: "material-symbols:auto-awesome",
			difficulty: "advanced",
			estimatedTime: "12 minutes",
			steps: [
				{
					title: "Global Eyedropper",
					content:
						"Use the global eyedropper to pick colors from anywhere on your screen, not just within PhoenyxColor. This is perfect for matching colors from other applications.",
					tips: [
						"Enable global eyedropper in Settings",
						"Works with any application or image on screen",
						"Picked colors are automatically added to your active palette",
					],
				},
				{
					title: "Keyboard Shortcuts",
					content:
						"Speed up your workflow with keyboard shortcuts. Press E to toggle the eyedropper, Ctrl+Z to undo, and Ctrl+S to save your work.",
					action: "Practice using keyboard shortcuts while working",
				},
				{
					title: "Undo/Redo System",
					content:
						"PhoenyxColor tracks your actions and allows you to undo/redo changes across all modules. The history is preserved until you close the application.",
					tips: [
						"Undo/redo works for all major actions",
						"History is cleared when you restart the app",
						"Use Ctrl+Z and Ctrl+Y for quick access",
					],
				},
				{
					title: "Data Management",
					content:
						"Export your entire workspace including palettes, gradients, and settings. Import previously saved data to restore your work environment.",
					action: "Try exporting your settings from the Settings panel",
				},
			],
		},
		{
			id: "tips-and-tricks",
			title: "Tips & Tricks",
			description: "Pro tips to enhance your color workflow",
			icon: "material-symbols:lightbulb-outline",
			difficulty: "intermediate",
			estimatedTime: "6 minutes",
			steps: [
				{
					title: "Efficient Color Picking",
					content:
						"Use the eyedropper tool strategically. Pick colors from different areas of your reference images to build comprehensive palettes.",
					tips: [
						"Sample from shadows, midtones, and highlights",
						"Consider color temperature variations",
						"Build palettes with 5-7 core colors",
					],
				},
				{
					title: "Organizing Your Work",
					content:
						"Use descriptive names for your palettes and gradients. Tag palettes with project names or color themes for easy searching.",
					action: "Rename your palettes with descriptive names and add relevant tags",
				},
				{
					title: "Color Harmony",
					content:
						"Use the time-of-day mood feature to create harmonious color variations. Morning moods add warmth, while evening moods add coolness.",
					tips: [
						"Morning: warmer, more saturated colors",
						"Afternoon: balanced, natural colors",
						"Evening: cooler, more muted colors",
					],
				},
				{
					title: "Export Optimization",
					content:
						"Choose the right export format for your needs. Use PNG for design software, CSS for web development, and ASE for Adobe applications.",
					action: "Export the same palette in different formats to see the differences",
				},
			],
		},
	];

	let activeTutorial = $state<TutorialSection | null>(null);
	let currentStep = $state(0);
	let searchQuery = $state("");

	const filteredTutorials = $derived(
		tutorials.filter(
			(tutorial) =>
				tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				tutorial.description.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	function startTutorial(tutorial: TutorialSection) {
		activeTutorial = tutorial;
		currentStep = 0;
		appStore.startTutorial(tutorial.id);
		toast.success(`Started tutorial: ${tutorial.title}`);
	}

	function nextStep() {
		if (activeTutorial && currentStep < activeTutorial.steps.length - 1) {
			currentStep++;
			appStore.nextTutorialStep();
		}
	}

	function previousStep() {
		if (currentStep > 0) {
			currentStep--;
			appStore.previousTutorialStep();
		}
	}

	function completeTutorial() {
		if (activeTutorial) {
			appStore.completeTutorial(activeTutorial.id);
			toast.success(`Completed tutorial: ${activeTutorial.title}`);
			activeTutorial = null;
			currentStep = 0;
		}
	}

	function exitTutorial() {
		appStore.exitTutorial();
		activeTutorial = null;
		currentStep = 0;
		toast.info("Tutorial exited");
	}

	function getDifficultyColor(difficulty: string) {
		switch (difficulty) {
			case "beginner":
				return "badge-success";
			case "intermediate":
				return "badge-warning";
			case "advanced":
				return "badge-error";
			default:
				return "badge-neutral";
		}
	}

	function isCompleted(tutorialId: string) {
		return appStore.state.tutorialState.completedTutorials.includes(tutorialId);
	}
</script>

<div class="container mx-auto p-6 max-w-6xl">
	{#if !activeTutorial}
		<!-- Tutorial Selection View -->
		<div class="mb-8">
			<div class="flex items-center gap-3 mb-2">
				<Icon icon="material-symbols:help-outline" class="text-3xl text-primary" />
				<h1 class="text-3xl font-bold text-base-content">Tutorials & Help</h1>
			</div>
			<p class="text-base-content/70">
				Learn how to use PhoenyxColor effectively with our comprehensive tutorials
			</p>
		</div>

		<!-- Search and Filter -->
		<div class="mb-6">
			<div class="form-control max-w-md">
				<label class="label" for="tutorial-search">
					<span class="label-text">Search tutorials</span>
				</label>
				<div class="input-group">
					<input
						id="tutorial-search"
						type="text"
						placeholder="Search by title or description..."
						class="input input-bordered flex-1"
						bind:value={searchQuery}
					/>
					<button class="btn btn-square btn-outline">
						<Icon icon="material-symbols:search" />
					</button>
				</div>
			</div>
		</div>

		<!-- Tutorial Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each filteredTutorials as tutorial}
				<div
					class="card bg-base-100 shadow-lg border border-base-300 hover:shadow-xl transition-shadow"
				>
					<div class="card-body">
						<div class="flex items-start justify-between mb-3">
							<Icon icon={tutorial.icon} class="text-3xl text-primary" />
							<div class="flex gap-2">
								<div class="badge {getDifficultyColor(tutorial.difficulty)} badge-sm">
									{tutorial.difficulty}
								</div>
								{#if isCompleted(tutorial.id)}
									<div class="badge badge-success badge-sm">
										<Icon icon="material-symbols:check" class="text-xs mr-1" />
										Completed
									</div>
								{/if}
							</div>
						</div>

						<h2 class="card-title text-lg mb-2">
							{tutorial.title}
						</h2>
						<p class="text-sm text-base-content/70 mb-4">
							{tutorial.description}
						</p>

						<div class="flex items-center justify-between text-xs text-base-content/60 mb-4">
							<span class="flex items-center gap-1">
								<Icon icon="material-symbols:schedule" />
								{tutorial.estimatedTime}
							</span>
							<span class="flex items-center gap-1">
								<Icon icon="material-symbols:list" />
								{tutorial.steps.length} steps
							</span>
						</div>

						<div class="card-actions justify-end">
							<button class="btn btn-primary btn-sm" onclick={() => startTutorial(tutorial)}>
								{isCompleted(tutorial.id) ? "Review" : "Start Tutorial"}
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>

		{#if filteredTutorials.length === 0}
			<div class="text-center py-12">
				<Icon icon="material-symbols:search-off" class="text-6xl text-base-content/30 mb-4" />
				<h3 class="text-xl font-semibold text-base-content/70 mb-2">No tutorials found</h3>
				<p class="text-base-content/50">Try adjusting your search terms</p>
			</div>
		{/if}

		<!-- Quick Help Section -->
		<div class="mt-12 card bg-base-100 shadow-lg border border-base-300">
			<div class="card-body">
				<h2 class="card-title text-xl mb-4">
					<Icon icon="material-symbols:help-center" class="text-primary" />
					Quick Help
				</h2>

				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					<div class="space-y-3">
						<h3 class="font-semibold text-base-content">Getting Started</h3>
						<ul class="space-y-1 text-sm text-base-content/70">
							<li>• Upload reference images by dragging and dropping</li>
							<li>• Create palettes with the "New Palette" button</li>
							<li>• Use the eyedropper to pick colors</li>
						</ul>
					</div>

					<div class="space-y-3">
						<h3 class="font-semibold text-base-content">Keyboard Shortcuts</h3>
						<ul class="space-y-1 text-sm text-base-content/70">
							<li>
								• <kbd class="kbd kbd-xs">E</kbd> Toggle eyedropper
							</li>
							<li>• <kbd class="kbd kbd-xs">Ctrl+Z</kbd> Undo</li>
							<li>• <kbd class="kbd kbd-xs">Ctrl+Y</kbd> Redo</li>
							<li>• <kbd class="kbd kbd-xs">Ctrl+S</kbd> Save</li>
						</ul>
					</div>

					<div class="space-y-3">
						<h3 class="font-semibold text-base-content">Tips</h3>
						<ul class="space-y-1 text-sm text-base-content/70">
							<li>• Right-click for context menus</li>
							<li>• Use descriptive names for organization</li>
							<li>• Export in the format you need</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<!-- Active Tutorial View -->
		<div class="mb-6">
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-3">
					<button
						class="btn btn-circle btn-outline btn-sm"
						onclick={exitTutorial}
						aria-label="Exit tutorial"
					>
						<Icon icon="material-symbols:arrow-back" />
					</button>
					<div>
						<h1 class="text-2xl font-bold text-base-content">
							{activeTutorial.title}
						</h1>
						<p class="text-sm text-base-content/70">
							Step {currentStep + 1} of {activeTutorial.steps.length}
						</p>
					</div>
				</div>

				<div class="badge {getDifficultyColor(activeTutorial.difficulty)}">
					{activeTutorial.difficulty}
				</div>
			</div>

			<!-- Progress Bar -->
			<div class="w-full bg-base-300 rounded-full h-2 mb-6">
				<div
					class="bg-primary h-2 rounded-full transition-all duration-300"
					style="width: {((currentStep + 1) / activeTutorial.steps.length) * 100}%"
				></div>
			</div>
		</div>

		<!-- Tutorial Step Content -->
		<div class="card bg-base-100 shadow-lg border border-base-300 mb-6">
			<div class="card-body">
				<h2 class="card-title text-xl mb-4">
					{activeTutorial.steps[currentStep].title}
				</h2>

				<div class="prose max-w-none text-base-content/80 mb-6">
					<p>{activeTutorial.steps[currentStep].content}</p>
				</div>

				{#if activeTutorial.steps[currentStep].tips}
					<div class="alert alert-info mb-6">
						<Icon icon="material-symbols:lightbulb" />
						<div>
							<h3 class="font-semibold mb-2">Tips:</h3>
							<ul class="list-disc list-inside space-y-1">
								{#each activeTutorial.steps[currentStep].tips || [] as tip}
									<li class="text-sm">{tip}</li>
								{/each}
							</ul>
						</div>
					</div>
				{/if}

				{#if activeTutorial.steps[currentStep].action}
					<div class="alert alert-warning">
						<Icon icon="material-symbols:touch-app" />
						<div>
							<h3 class="font-semibold">Try it out:</h3>
							<p class="text-sm">
								{activeTutorial.steps[currentStep].action}
							</p>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Navigation Controls -->
		<div class="flex justify-between items-center">
			<button class="btn btn-outline" onclick={previousStep} disabled={currentStep === 0}>
				<Icon icon="material-symbols:arrow-back" />
				Previous
			</button>

			<div class="flex gap-2">
				{#each activeTutorial.steps as _, index}
					<button
						class="btn btn-circle btn-xs {index === currentStep ? 'btn-primary' : 'btn-outline'}"
						onclick={() => (currentStep = index)}
						aria-label="Go to step {index + 1}"
					>
						{index + 1}
					</button>
				{/each}
			</div>

			{#if currentStep === activeTutorial.steps.length - 1}
				<button class="btn btn-success" onclick={completeTutorial}>
					<Icon icon="material-symbols:check" />
					Complete Tutorial
				</button>
			{:else}
				<button class="btn btn-primary" onclick={nextStep}>
					Next
					<Icon icon="material-symbols:arrow-forward" />
				</button>
			{/if}
		</div>
	{/if}
</div>
