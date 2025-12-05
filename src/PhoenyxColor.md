
PhoenyxColor: Architectural Master Plan for a Next-Generation Color Picker

1. Executive Summary: The "Interface Is You" Paradigm

The current ecosystem of color pickers is dominated by utilitarian efficiency. Applications such as Daijishō and Beacon have mastered the mechanics of file parsing and metadata scraping, yet they often fail to capture the emotional resonance of the hardware they emulate. The "iiSU" project represents a fundamental divergence from this utilitarian trajectory. By referencing the design philosophies of the Nintendo Wii U, Nintendo 3DS, and the Sony PSP’s XrossMediaBar (XMB), iiSU aims to reconstruct the "soul" of the console experience.1 The core philosophy—that the "Interface Is You"—suggests a digital environment that is not merely a launcher, but a living, reactive extension of the user’s gaming identity.3
This comprehensive architectural report serves as a strategic roadmap for transforming the current iiSU prototype into a "Tier-1" application. It addresses the user's specific desire to build "an application that people would truly like using" by bridging the gap between nostalgic aesthetics and cutting-edge web technologies. The analysis indicates that to achieve this, the development must move beyond surface-level visual mimicry and implement deep, systems-level innovations in neuro-aesthetic rendering, physics-based interaction, perceptual color science, and decentralized social connectivity.
The following sections provide an exhaustive technical and design specification for realizing this vision. We will dissect the implementation of "Neo-Aero" visuals using Svelte 5 and Tailwind 4, the integration of "NetPass" social mechanics using Cloudflare D1, and the creation of a tactile "Nintendo-feel" through spring physics and spatial audio. This is not just a feature list; it is a blueprint for building a digital home.

2. Visual Architecture: The "Neo-Aero" Renaissance

The visual identity of iiSU is rooted in a revival of the "Frutiger Aero" design language that dominated the mid-2000s—glossy textures, humanism, and optimism—updated for modern high-DPI OLED displays.1 We classify this aesthetic direction as Neo-Aero: a synthesis of the depth and playfulness of 2012-era Nintendo UI with the performance and clarity of 2025 web rendering engines.

2.1. Optical Physics and Advanced Glassmorphism

Modern "Glassmorphism" often fails because it treats the UI as a simple 2D layer with a blur filter. To achieve the premium, tactile feel of a console OS (like the Wii U or VisionOS), iiSU must simulate optical physics. The interface acts not as a flat overlay, but as a refractive medium through which the user views their content.

2.1.1. Luminance-Preserving Refraction

A critical challenge in glass UI is legibility. When diverse game art—ranging from the dark, low-contrast cover of Silent Hill to the bright, high-saturation art of Super Mario World—slides behind a glass panel, standard transparency compromises text readability. The solution lies in luminance-preserving compositing.
Rather than a simple opacity or blur setting, the glass panels in iiSU must utilize a multi-layered CSS composition. The base layer applies a heavy Gaussian blur (e.g., backdrop-filter: blur(20px)), which destroys high-frequency detail but preserves the average color. Above this, a mix-blend-mode: overlay or soft-light layer introduces a noise texture and a gradient mask. This technique dynamically adjusts the contrast of the glass based on the luminance of the underlying asset. If the game art is dark, the glass essentially "illuminates" slightly to maintain contrast for white text; if the art is bright, the glass dims. This mimics the behavior of physical frosted glass, which scatters light rather than just reducing opacity.5

2.1.2. Depth-Based Focal Rendering

To reinforce the "sense of place" mentioned in the project goals, the UI must respect focal depth. In a 3D space, objects further away appear blurrier than objects close to the lens. iiSU should implement a Variable Blur Radius system.
The Wallpaper Layer: This layer sits furthest back and should simulate a distant focal plane. It requires a high blur radius (e.g., 40px to 60px) and a saturation boost. This turns the wallpaper into an abstract "ambient light source" rather than a competing visual element.
The Content Layer: Inactive lists or background elements should carry a medium blur (12px to 16px), signaling they are present but out of focus.
The Active Plane: The currently selected game card or active modal must have zero blur and maximum sharpness, potentially enhanced by a subtle "bloom" or outer glow (box-shadow).
This hierarchy guides the user's eye naturally, reducing cognitive load. The user instantly knows where they "are" in the interface based on sharpness, a technique heavily utilized in the Sony XMB design.3

2.1.3. Tailwind CSS v4 Implementation Strategy

With the adoption of Tailwind CSS v4, we can generate these complex optical effects using dynamic utility classes and CSS variables, ensuring high performance. The configuration should define specific "materials" rather than just colors.
Material Class
CSS Composition
Usage Scenario
.glass-oled
bg-black/80 backdrop-blur-xl backdrop-saturate-150 border-white/10
Dark mode panels for OLED handhelds to save battery while retaining depth.
.glass-aero
bg-white/20 backdrop-blur-lg backdrop-saturate-200 border-white/40 shadow-glass
The default "Wii U" aesthetic; high vibrancy and lightness.
.glass-hud
bg-gray-900/40 backdrop-blur-md border-t-white/20
Heads-up display elements like battery, clock, and connection status.

The inclusion of backdrop-saturate-150 (or higher) is crucial. As colorful game assets pass behind the glass, the saturation boost ensures they bleed color into the UI, making the interface feel "warm" and "alive" rather than washed out.6

2.2. Algorithmic Art Direction: The "Chameleon" Engine

Static themes are a relic of the past. The Wii U’s "WaraWara Plaza" felt distinct because it was populated by the specific Mii characters and games of the moment. iiSU takes this further with a Procedural Theming Engine. The interface must adapt its color palette in real-time to match the currently focused game, creating a bespoke environment for every title in the user's library.

2.2.1. Perceptual Color Extraction with OkLCH

Traditional color extraction methods (like extracting the "average" color via standard RGB averaging) often result in muddy, desaturated browns or greys, as averaging a colorful image mathematically tends toward neutral grey. To capture the "soul" of a game's art, we must use Perceptual Color Science.
The extraction algorithm must operate in the OkLCH (Lightness, Chroma, Hue) color space. Unlike RGB or HSL, OkLCH is perceptually uniform—meaning changes in numerical values correspond linearly to changes in human perception. The algorithm follows these steps:
Quantization: The game's box art or screenshot is downsampled, and pixels are grouped using K-Means Clustering or Median Cut algorithms to find dominant color clusters.7
Perceptual Filtering: We filter these clusters based on Chroma (C) and Lightness (L). We discard colors with low Chroma (greys, dull browns) unless the entire image is monochromatic (e.g., Limbo). We prioritize colors with high Chroma to capture the "vibe" (e.g., the neon blue of Mega Man or the deep crimson of Persona 5).8
Palette Generation: The system selects a triad:
Primary: The most dominant high-chroma color (used for backgrounds/gradients).
Secondary: A color with distinct hue separation from the Primary (used for UI accents).
Contrast: A high-legibility color (white or black) determined by the Lightness of the Primary.
This process ensures that when the user scrolls to The Legend of Zelda: Wind Waker, the entire application shifts to an oceanic turquoise palette; scrolling to Super Metroid shifts it to a sci-fi purple and neon green.

2.2.2. Harmonic Sorting via Hilbert Curves

A "deep dive" into the user's requested features reveals the need for library organization. When presenting a grid of thousands of games, random ordering can look chaotic. Sorting by color creates a visually stunning "rainbow" effect that is highly pleasing to the eye.
However, sorting colors in 1D (a list) is mathematically complex because color is 3D (Red, Green, Blue). Standard sorting often groups unrelated colors. The superior solution for iiSU is to map the colors to a 3D Hilbert Curve.10 The Hilbert Curve is a continuous fractal space-filling curve. By walking along this curve through the RGB color cube, we can linearize the colors in a way that preserves locality—colors that are close in the list are visually similar. Implementing this allows iiSU to offer a "Spectrum View," where the user's entire library is displayed as a flowing gradient of box art, transforming a file list into an interactive art installation.

2.3. The Procedural "Living" Background

Static wallpapers kill the illusion of a living world. The background of iiSU must be a Procedural Ambient System.
Floating Symbology: Using the HTML5 Canvas API, the background should generate floating symbols relevant to the platform (e.g., geometric shapes for PlayStation, button prompts for Nintendo).
Gyroscope Parallax: On handheld devices (Ayaneo, Steam Deck), the background layers should react to the device's DeviceOrientationEvent. As the user physically tilts the device, the background particles should drift in opposition, creating a window-pane parallax effect that gives the screen depth.4
Time-of-Day Dynamics: The "glass" lighting temperature should shift based on the real-world clock—cool blue at noon, warm gold at sunset, and deep violet at night—grounding the emulation experience in the user's physical reality.2

3. Kinetic Interaction Design: The Physics of Joy

The difference between a functional web app and a polished console OS lies in the domain of motion physics. The user's request for an app they would "truly like using" implies a need for satisfying interaction. Satisfaction in UI is derived from responsiveness and predictability.

3.1. Spring Physics vs. Linear Interpolation

Most web interfaces use CSS transitions with Bezier curves (e.g., ease-in-out). These are deterministic: a transition takes exactly 300ms. If a user interrupts this transition (by rapidly moving the cursor), the UI must abruptly restart, leading to a "janky" feel.
iiSU must abandon duration-based animation in favor of Spring Physics.
The Physics Model: A spring is defined by Stiffness (tension), Damping (friction), and Mass.
Cursor Dynamics: The selection cursor should be modeled as a physical object attached to the user's input via a spring.
High Stiffness (180-200): Ensures the cursor snaps quickly to the new target.
Critical Damping (25-30): Prevents excessive oscillation (wobble) while allowing a very slight overshoot that settles instantly. This makes the cursor feel "heavy" and precise, like a high-end physical dial.13
Rubber Banding: When a user scrolls to the end of a game list, the list shouldn't hit a hard wall. It should stretch (using a spring with lower stiffness) and bounce back. This "bounciness" is a hallmark of Nintendo's design language, conveying system limits playfully rather than strictly.14

3.2. Spatial Navigation: The "Magnetic" Grid

The research indicates iiSU will be used on devices with D-Pads and analog sticks (e.g., AYN Thor).2 Navigating a web-based grid with a D-Pad is notoriously difficult if the grid items are irregular sizes (e.g., mixing SNES landscape boxes with NES portrait boxes).
iiSU requires a robust Spatial Navigation Engine (e.g., leveraging @noriginmedia/norigin-spatial-navigation or a custom Svelte implementation).15
Vector-Based Selection: Instead of relying on DOM order (Tab Index), the engine calculates the vector angle and Euclidean distance between the center of the currently focused item and the centers of all candidate items in the requested direction.
Stickiness and Magnetism: The system should favor preserving the axis. If a user is scrolling down a column, the focus algorithm should heavily weight items that align vertically, even if a diagonal item is technically closer by pixel distance. This "magnetic" feeling builds muscle memory.
Virtual Focus State: The focus state must be decoupled from the browser's native :focus. This allows for "phantom focus" where the user can scroll a background list while a modal is open, or control dual-screen layouts independently.

4. Auditory User Experience (AUX): The Soundscape

A silent frontend feels "dead." The Wii U and 3DS are legendary not just for their visuals, but for their "eShop music" and satisfying interaction sounds. Sound provides confirmation and texture to digital actions.

4.1. The "Audio Sprite" Architecture

Latency is the enemy of UI sound. If a user presses "Down" on the D-Pad, the click sound must happen within 10-20ms. Waiting for an MP3 to fetch over HTTP is unacceptable.
Tech Stack: We utilize Howler.js wrapped in a Svelte store (svelte-sound action).18
Sprite Implementation: All UI sounds (hover, click, back, error, launch) are compiled into a single audio file (a sprite). The application loads this once at startup. Playback triggers purely via memory pointers (seek and play), ensuring zero-latency feedback.20

4.2. Psychoacoustic Design

The specific sounds used define the personality of the app.
Navigation Ticks: Should be high-frequency, short-decay transients (like a refined metronome). This cuts through background music without causing fatigue.
Confirmation Chimes: Should be harmonious and resonant (e.g., a major third chord).
Dynamic Mixing: The background music (BGM) must be context-aware.
Attentional Ducking: When the user enters a "Search" or "Settings" mode, a Low-Pass Filter (LPF) should seamlessly activate on the music track, muffling the high frequencies. This psychoacoustically pushes the music into the "background," signaling to the user's brain that focus is now required for a task.
Generative Ambience: Rather than looping a single track, iiSU can use randomized layering of ambient stems (pads, soft bells, nature sounds) to ensure the BGM never becomes repetitive, even if the app is left running for hours.21

5. The iiSU Network: Decentralized Social Emulation

The most significant unsatisfied requirement in the user's request is the deep dive into "social media integration... PictoChat... and StreetPass".1 This moves iiSU from a "Launcher" to a "Platform."

5.1. "NetPass": Reimagining StreetPass

The Nintendo 3DS "StreetPass" feature was a masterpiece of passive social interaction. iiSU can recreate this globally using Cloudflare D1 and Edge Workers.
The Mechanic:
Users opt-in to "NetPass."
While the app is running, the client sends a lightweight "heartbeat" to the Cloudflare Edge.
The server identifies other users who are "virtually nearby." Proximity can be defined by Game Genre (playing RPGs), Geography (same city/region), or Library Overlap (both have EarthBound).
When a "pass" occurs, users silently exchange Profile Cards.
The Exchange: A Profile Card contains:
A custom Mii-like avatar (SVG vector data).
"Last Played" status.
A "featured recommendation" (e.g., "You should try Chrono Trigger!").
Gamification: Collecting cards unlocks visual rewards (new glass themes, avatar accessories). This incentivizes users to keep iiSU open, populating the network.22

5.2. "PictoVerse": The Asynchronous Graffiti Layer

Real-time chat in emulation frontends is often toxic or empty. A better model is the Asynchronous Graffiti system seen in Dark Souls or the Wii U's Miiverse.
Contextual Doodling:
Every game in the library has a "Graffiti Wall."
Users can open a canvas overlay and draw a handwritten note or doodle (using touch or mouse) specific to that game (e.g., drawing a map secret on the Metroid page).
These doodles appear as "stickers" on the game's details page for other users.
Technical Implementation:
Canvas API: The drawing is captured as a set of vector paths or a lightweight PNG.
Storage: The data is stored in Cloudflare D1 (SQLite). D1 is ideal here because it is low-cost and optimized for read-heavy workloads (millions of users reading doodles, fewer writing them).23
Safety: To manage moderation without a large team, the system relies on "Up/Down" voting. Doodles with negative scores are hidden. "Trust scores" are assigned to users; high-trust users' doodles appear more prominently.

5.3. Infrastructure: The Cloudflare Advantage

The user expressed concern about infrastructure costs ("no way they will able to afford... infrastructure" 25). This is a valid concern for traditional servers, but solvable with Serverless Edge.
Feature
Traditional Server (AWS EC2)
Edge Serverless (Cloudflare)
Database
Expensive, requires maintenance, latency depends on region.
D1 (SQLite): Free tier is generous, scales automatically, zero maintenance.
Real-Time
Requires dedicated WebSocket servers (Redis/Socket.io).
Durable Objects: Handle WebSocket connections per "room" cheaply.
Assets
S3 Bandwidth costs are high.
R2 Storage: Zero egress fees. Ideal for storing user doodles/avatars.

By building on the Cloudflare Stack (Pages + Functions + D1 + R2), iiSU can support a social network of 100,000+ users for negligible monthly cost, solving the sustainability problem.26

6. Hardware Optimizations: The Platform Engine

iiSU is intended for devices ranging from high-end PCs to low-power Android handhelds. Optimization is not optional.

6.1. Dual-Screen Architecture (DS Mode)

Snippet 2 highlights specific support for dual-screen devices like the Ayaneo Flip DS or Surface Duo. This is a unique selling point.
Viewport Management: The application must detect the secondary display (via Window Management API or user toggle).
State Separation: The Svelte state must decouple the "Visuals" from the "Controls."
Top Screen: Renders the "Cinematic" component (High-res fan art, video previews).
Bottom Screen: Renders the "Control" component (Grid library, touch keyboard, PictoChat canvas).
Teleportation: Using Svelte's <svelte:component> or portal actions, elements can be dynamically "teleported" between screens. For example, clicking "Settings" on the bottom screen might slide the settings panel up from the bottom, while the top screen blurs to show focus has shifted.

6.2. Virtualization and Memory Management

A user's library may contain 10,000+ ROMs. Rendering 10,000 DOM nodes will crash a mobile browser.
Virtual Lists: We must implement Windowing (using svelte-virtuallists or tanstack-virtual). The DOM only contains the ~20 items currently visible. As the user scrolls, items leaving the viewport are destroyed and new ones created.
Image Lazy Loading: Box art images must use loading="lazy" and decoding="async". Furthermore, a "BlurHash" string should be stored in the database. Before the image loads, a tiny, blurred version of the colors is displayed, preventing the "white flash" of unloaded images and maintaining the aesthetic smoothness.28

7. Technical Stack Specification: The "Snappy" Stack

To execute this vision, the technology stack must be carefully chosen for performance and developer experience.

7.1. Core Framework: Svelte 5 (Runes)

Svelte 5 is the optimal choice for this project due to its compiler-based nature.30
Runes ($state, $derived, $effect): These primitives allow for granular reactivity. When a download progress bar updates, only that text node updates. React would trigger a component re-render. This efficiency is critical for maintaining 60 FPS on ARM-based handhelds.
Store Architecture: Svelte stores are perfect for global state like "Current Theme Colors" or "Audio Volume," which can be subscribed to by any component without prop drilling.

7.2. Styling: Tailwind CSS v4

Tailwind 4's new engine brings instant compilation and CSS variable support.31
Container Queries: Handheld screens vary wildly (4:3, 16:9, square). Tailwind's @container support allows game cards to rearrange their internal layout (e.g., moving text below the image vs. overlaying it) based on the card's width, not just the screen width.

7.3. Integration Pipeline: Figma-to-Code

To support the "Community Themes" aspect, the developer experience should leverage Figma.
Plugin Architecture: Using a template like figma-sveltekit-plugin-template 32, we can build a Figma plugin that allows designers to visually construct themes. The plugin exports a JSON file defining colors, blurs, and assets, which iiSU can import. This effectively crowdsources the design work to the community.34

8. Implementation Roadmap: The Path to v1.0

To manage the complexity of this "deep dive," development should be phased:

Phase 1: The "Feel" (Core Physics & Navigation)

Objective: Replace the current static grid with a physics-based engine.
Tasks:
Migrate generic lists to svelte-virtuallists.
Implement svelte-motion Spring Physics for cursor movement.
Integrate @noriginmedia/norigin-spatial-navigation for controller support.

Phase 2: The "Look" (Aesthetics & Audio)

Objective: Implement the "Neo-Aero" visual language.
Tasks:
Build the OkLCH Color Extraction service (culori).
Configure Tailwind 4 for optical glass materials.
Implement the Howler.js audio sprite system with "Nintendo-style" SFX.

Phase 3: The "Soul" (Social & Cloud)

Objective: Connect the user base.
Tasks:
Deploy Cloudflare D1/Workers backend.
Build the "NetPass" handshake protocol.
Implement the "PictoVerse" drawing canvas and syncing.

9. Conclusion

The "iiSU" project is poised to fill a significant emotional void in the emulation market. By treating the frontend not as a utility but as a place—a "digital living room" crafted from optical glass, responsive physics, and community connection—it addresses the user's desire for an application they would "truly like using." The technologies identified in this report (Svelte 5, Cloudflare D1, OkLCH, Spatial Navigation) provide a robust, scalable, and performant foundation to make this vision a reality. The "Interface Is You" is not just a name; it is the architectural north star.
Works cited
iiSU Is Shaping Up To Be The Innovative Emulation Frontend of Tomorrow - Steam Deck HQ, accessed November 28, 2025, <https://steamdeckhq.com/news/iisu-is-shaping-up-to-be-the-innovative-emulation-frontend-of-tomorrow/>
iiSU Frontend: The Future of Emulation? - YouTube, accessed November 28, 2025, <https://www.youtube.com/watch?v=lFnXuZhWlVg>
Exclusive: Inside iiSU's bold vision for emulation handhelds - The Memory Core, accessed November 28, 2025, <https://thememorycore.kit.com/posts/iisu-emulation-frontend>
UI trends 2026: top 10 trends your users will love - UX studio, accessed November 28, 2025, <https://www.uxstudioteam.com/ux-blog/ui-trends-2019>
How To Implement Glassmorphism With Tailwind CSS Easily? - FlyonUI, accessed November 28, 2025, <https://flyonui.com/blog/glassmorphism-with-tailwind-css/>
How to implement glassmorphism with CSS - DEV Community, accessed November 28, 2025, <https://dev.to/logrocket/how-to-implement-glassmorphism-with-css-19g1?comments_sort=latest>
AI vs Traditional Color Selection: A Comparative Analysis of Top Color Palette Generators in 2025 - SuperAGI, accessed November 28, 2025, <https://superagi.com/ai-vs-traditional-color-selection-a-comparative-analysis-of-top-color-palette-generators-in-2025/>
Color contrast with OKLCH; prefers-reduced-motion and motion design ethics - Medium, accessed November 28, 2025, <https://medium.com/@vyakymenko/color-contrast-with-oklch-prefers-reduced-motion-and-motion-design-ethics-089c0c8897d0>
OKLCH in CSS: why we moved from RGB and HSL - Evil Martians, accessed November 28, 2025, <https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl>
Sorting colours with Hilbert curves - CodePen, accessed November 28, 2025, <https://codepen.io/codebje/pen/rOjZQj>
How to sort colors properly? - Mathematica Stack Exchange, accessed November 28, 2025, <https://mathematica.stackexchange.com/questions/87588/how-to-sort-colors-properly>
Color sorting (RGB) with 3-D Hilbert curve · Issue #64 · leios/SoME_Topics - GitHub, accessed November 28, 2025, <https://github.com/leios/SoME_Topics/issues/64>
svelte/motion • Svelte Docs, accessed November 28, 2025, <https://svelte.dev/docs/svelte/svelte-motion>
The physics behind spring animations - The Blog of Maxime Heckel, accessed November 28, 2025, <https://blog.maximeheckel.com/posts/the-physics-behind-spring-animations/>
Spatial Navigation | Open-Source ReactJS TV App Library - Norigin Media, accessed November 28, 2025, <https://noriginmedia.com/spatial-navigation/>
@noriginmedia/norigin-spatial-navigation - NPM, accessed November 28, 2025, <https://www.npmjs.com/package/@noriginmedia/norigin-spatial-navigation>
A javascript-based implementation of Spatial Navigation. - GitHub, accessed November 28, 2025, <https://github.com/luke-chang/js-spatial-navigation>
Rajaniraiyn/svelte-sound: sound interactions made easy - GitHub, accessed November 28, 2025, <https://github.com/Rajaniraiyn/svelte-sound>
Spice Up Your Svelte App with Sound Interactions using svelte-sound - DEV Community, accessed November 28, 2025, <https://dev.to/rajaniraiyn/spice-up-your-svelte-app-with-sound-interactions-using-svelte-sound-4i6b>
howler.js - JavaScript audio library for the modern web, accessed November 28, 2025, <https://howlerjs.com/>
SSBMTonberry/emusound: A permissive cross-platform library to play sound files from old consoles (NES, SNES etc), as well as common sound files. - GitHub, accessed November 28, 2025, <https://github.com/SSBMTonberry/emusound>
iiSU – A New Android Emulation Front-End Announced - Update 20251004, accessed November 28, 2025, <https://metalgamesolid.com/emulation/emulators/iisu-a-new-android-emulation-front-end-announced/>
D1 Database in a Cloudflare Pages SvelteKit App | Full Stack Wizardry - Medium, accessed November 28, 2025, <https://medium.com/full-stack-engineer/use-a-d1-sqlite-database-in-a-cloudflare-pages-sveltekit-application-3b32c8c60556>
I build an AI directory using Cloudflare R2, D1 + Drizzle, Cloudflare Pages, and Sveltekit, accessed November 28, 2025, <https://www.reddit.com/r/SvelteKit/comments/1c80emc/i_build_an_ai_directory_using_cloudflare_r2_d1/>
"iiSU" is ambitious as hell! Lets see how it goes... : r/SBCGaming - Reddit, accessed November 28, 2025, <https://www.reddit.com/r/SBCGaming/comments/1p6m7oj/iisu_is_ambitious_as_hell_lets_see_how_it_goes/>
Sveltekit better auth using Cloudflare D1 and drizzle | by David - Medium, accessed November 28, 2025, <https://medium.com/@dasfacc/sveltekit-better-auth-using-cloudflare-d1-and-drizzle-91d9d9a6d0b4>
SvelteKit 2025 Databases & Auth with Cloudflare D1 ☸️ Steerlist App LIVE Coding & Chill - YouTube, accessed November 28, 2025, <https://www.youtube.com/watch?v=CEFhqw8T8RE>
Svelte Virtuallists - Virtualization Library, accessed November 28, 2025, <https://madewithsvelte.com/svelte-virtuallists>
@humanspeak/svelte-virtual-list - npm, accessed November 28, 2025, <https://www.npmjs.com/package/@humanspeak/svelte-virtual-list>
Svelte 5 migration guide, accessed November 28, 2025, <https://svelte.dev/docs/svelte/v5-migration-guide>
Installing Tailwind CSS with Vite, accessed November 28, 2025, <https://tailwindcss.com/docs>
fignite/figma-sveltekit-plugin-template - GitHub, accessed November 28, 2025, <https://github.com/fignite/figma-sveltekit-plugin-template>
Figsvelte - Boilerplate for Svelte Figma Plugins, accessed November 28, 2025, <https://madewithsvelte.com/figsvelte>
thomas-lowry/figsvelte: A boilerplate for creating Figma plugins with Svelte - GitHub, accessed November 28, 2025, <https://github.com/thomas-lowry/figsvelte>
Figma Plugin using Svelte (self-promotion) : r/sveltejs - Reddit, accessed November 28, 2025, <https://www.reddit.com/r/sveltejs/comments/1eeira8/figma_plugin_using_svelte_selfpromotion/>
