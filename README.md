# yuezhouingrid.com: custom code

The custom React code behind my portfolio site, [yuezhouingrid.com](https://yuezhouingrid.com), built in Framer.
Everything here runs inside Framer as **code components** (things you drop on the canvas) or **code overrides** (behaviour attached to a normal Framer layer).

## Components

| File | What it does | Where it's used |
|---|---|---|
| `SleeveWrap.tsx` | Maps the flat coffee-sleeve dieline onto a 3D cup with CSS 3D transforms + canvas. Drag or click to wrap/unwrap it, spin the cup; a second mode just spins it on display. | Common Ground |
| `StoryPlayer.tsx` | iPhone with an Instagram home feed; tap the profile picture and the story opens and plays. | Common Ground |
| `IgProfile.tsx` | Instagram profile page on an iPhone; tapping the avatar opens the story in `StoryPlayer`. | Common Ground |
| `LogoCycle.tsx` | Cuts a logo-system grid into tiles and cycles through the colourways, auto-centring each logo. | Common Ground |
| `DeviceScroll.tsx` | Laptop (and optional phone) mock-up you can scroll inside. | Common Ground |
| `ImageCrop.tsx` | Shows one rectangle of a larger image. | Common Ground |
| `ScrollRoute.tsx` | Dashed route line that draws itself as you scroll and lands on a heading. | Home, All work |
| `ProjectMap.tsx` | Projects as stops on a transit line over a contour map. | Home |
| `JourneyMap.tsx` | Small line map of where I've studied (London, ON → Mississauga → Toronto). | About |
| `DitherPortrait.tsx` | Turns a photo into a pixel / halftone portrait on canvas, optionally pushed around by the cursor. | Home |

## Overrides

`overrides/StripScroll.tsx` holds the site-wide behaviour: the opening curtain, the horizontal project strip with eased scrolling and page-turn lean, hover effects, speech bubbles, slow back-to-top, the live Toronto coordinates, and the back arrow that returns to Selected work or All work depending on where you came from.

## Running it

These files import from `framer` and `framer-motion`, so they're meant to be pasted into a Framer project (Assets → Code), not run on their own.
