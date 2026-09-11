# QR Studio — Design Direction

## Three stylistic approaches

### Theme Name: Signal Atelier
**Very Brief Intro:** An editorial instrument for making QR codes feel designed, not generated. Warm paper tones, ink-black surfaces, and a precise citrus accent create a confident studio atmosphere.
**Probability:** 0.04

### Theme Name: Quiet Grid
**Very Brief Intro:** A calm, high-trust utility with pale stone, graphite, and disciplined modular geometry. The mood is effortless clarity for people who need a QR code ready in seconds.
**Probability:** 0.08

### Theme Name: Night Relay
**Very Brief Intro:** A dark control room where soft blue signal trails and electric coral accents suggest movement through connected spaces. It is expressive and technical without becoming noisy.
**Probability:** 0.02

## Chosen Approach: Minimal Signal

### Design Movement
Quiet utility design: a restrained digital workspace influenced by modern productivity tools and Swiss information design, with emphasis on legibility, calm surfaces, and clear affordances.

### Core Principles
1. **Reduce the interface to the work:** The QR preview and essential controls should remain the visual priority.
2. **Use one accent with discipline:** Neutral grays carry the system; a single muted blue marks focus, selection, and action.
3. **Prefer spacing to decoration:** Whitespace, alignment, and type hierarchy replace texture, ornament, and heavy shadow.
4. **Make every state obvious:** Active controls, status, and export actions should be clear without visual noise.

### Color Philosophy
The interface uses white, soft gray, and charcoal as a quiet foundation that supports scanning and long sessions. A restrained muted blue (#5B7CFA) is reserved for focus, active selections, sliders, and export emphasis. Green is used only for successful scan-readiness and contrast status; no gradients or competing accent colors are needed.

### Layout Paradigm
A focused two-column workbench: controls on the left and the live QR preview on the right. The composition stays spacious but compact, with the preview moving above the control rail on mobile so the output remains immediately visible.

### Signature Elements
- **Quiet borders:** Thin neutral rules separate sections without making every region feel like a card.
- **Clear active states:** A single accent outline or underline shows what is selected.
- **Preview-first hierarchy:** The generated QR remains the strongest object on the page.

### Interaction Philosophy
Interactions should feel immediate and understandable. Controls update the preview directly, selected states are visible at a glance, and secondary actions stay visually quiet until needed. Downloads and reset/copy actions remain one click away without competing with the QR itself.

### Animation
Use restrained motion under 200ms. Fade and translate major regions slightly on entry, keep control updates immediate, and use subtle border/color transitions for hover and focus. Respect prefers-reduced-motion by disabling nonessential transitions.

### Typography System
Use **Manrope** for the entire interface with 500–800 weights. Headlines use bold, compact proportions; controls and body copy use regular to semibold weights; **IBM Plex Mono** is reserved for QR metadata and hex values. Avoid decorative display faces and italics.

### Brand Essence
A focused QR generator for everyday links — for people who want customization without the clutter. **Clear, capable, calm.**

### Brand Voice
Headlines are direct and practical. CTAs describe the action plainly. Microcopy explains what matters and stays out of the way.

Example headline: **Create a QR code that fits.**

Example CTA: **Export PNG.**

### Wordmark & Logo
Keep the compact `QR / STUDIO` lockup with a simple scan-bracket mark, rendered in charcoal and white so the brand remains recognizable without relying on decoration.

### Signature Brand Color
**Quiet Blue — #5B7CFA.** It is used sparingly for active states and focus, keeping the rest of the interface neutral.

## Style Decisions

- Keep the primary workspace light and paper-like; use ink-black for navigation and high-contrast QR surfaces.
- Avoid generic dashboard cards, excessive rounded containers, purple gradients, and default Inter typography.
- Use the QR code itself as the hero visual; decorative assets should support the studio/proofing metaphor rather than compete with it.
- All page and component files should retain a short style reminder at the top so later edits reinforce Signal Atelier.
- The surrounding application page stays white, honoring the current user preference; green is reserved for scan readiness and the primary success action.
- The header uses a compact **QR / STUDIO** lockup with a scan-like mark and restrained uppercase utility navigation.
- Blue communicates active selection, focus, and export; green communicates creation success; remaining controls use slate and white.
- The lower information area must remain visibly secondary so the generator stays the primary focus.

## Reference Layout Specification — Ground Truth

The attached reference image is the source of truth for this replication pass. Match its composition and visual hierarchy rather than inventing a new page structure.

The page uses a full-bleed deep green background with a centered desktop content column. The top header is compact: a white logo and wordmark sit on the left, while uppercase utility links sit on the right. Directly below is a horizontal QR content-type navigation bar with the active type underlined in white.

The main generator surface is a large white rounded rectangle with a subtle shadow. It is split into two columns. The left side is a pale blue-gray settings area containing a prominent “Enter content” row, a URL field, a compact toggle row, and collapsed accordion rows for “Set colors,” “Add logo image,” and “Customize design.” The right side is a white preview/export area with a large QR code, a quality slider, green and blue primary actions, and quieter format buttons below.

The reference uses small uppercase utility labels, compact spacing, simple icon-leading rows, and a restrained blue/green action palette. The overall feeling is practical, approachable, and tool-first. On mobile, the centered panel should collapse to a single column while keeping the type bar horizontally scrollable and the QR preview accessible.

## Current Style Decision for This Pass

This is a reference replication task. The reference composition overrides the previous Minimal Signal layout direction for the page structure. Preserve QR Studio branding and functionality, but follow the reference’s green shell, header placement, type bar, split panel, accordion controls, and preview/export hierarchy.
