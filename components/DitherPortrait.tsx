import { addPropertyControls, ControlType } from "framer"
import { useEffect, useRef } from "react"

interface Props {
	image?: { src?: string; alt?: string } | string
	cell: number
	look: "pixels" | "dots"
	ink: string
	contrast: number
	brightness: number
	cutoff: number
	focusY: number
	alt: string
	colored?: boolean
	interactive?: boolean
	style?: Record<string, any>
}

// 8×8 Bayer matrix for ordered dithering
const BAYER = [
	[0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
	[3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25], [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21],
]

/**
 * Turns a photo into a black-and-white pixel / halftone portrait, drawn on a canvas.
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */
export default function DitherPortrait(props: Props) {
	const { image, cell = 4, look: mode = "pixels", ink = "#1a1814", contrast = 1.3, brightness = 0.05, cutoff = 0.86, focusY = 0.3, alt = "Portrait", colored = false, interactive = false } = props
	const rootStyle = props.style || {}
	const box = useRef<HTMLDivElement>(null)
	const cv = useRef<HTMLCanvasElement>(null)
	const src = typeof image === "string" ? image : image?.src

	useEffect(() => {
		const el = box.current, canvas = cv.current
		if (!el || !canvas || !src) return
		let cancelled = false
		const img = new Image()
		img.crossOrigin = "anonymous"
		// interactive mode: every cell becomes a particle that is pushed by the pointer and springs back home
		type P = { hx: number; hy: number; x: number; y: number; vx: number; vy: number; s: number; col: string; round: boolean }
		let parts: P[] = []
		let raf = 0
		let mx = -9999, my = -9999
		let W0 = 0, H0 = 0
		const paint = () => {
			const ctx = canvas.getContext("2d"); if (!ctx) return
			ctx.clearRect(0, 0, W0, H0)
			for (const p of parts) {
				ctx.fillStyle = p.col
				if (p.round) { ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill() }
				else ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s)
			}
		}
		const step = () => {
			raf = 0
			const R = Math.max(50, Math.min(W0, H0) * 0.22)
			let moving = false
			for (const p of parts) {
				const dx = p.x - mx, dy = p.y - my
				const d2 = dx * dx + dy * dy
				if (d2 < R * R) {
					const d = Math.sqrt(d2) || 1
					const f = (1 - d / R) * 2.2
					p.vx += (dx / d) * f; p.vy += (dy / d) * f
				}
				p.vx += (p.hx - p.x) * 0.06; p.vy += (p.hy - p.y) * 0.06
				p.vx *= 0.84; p.vy *= 0.84
				p.x += p.vx; p.y += p.vy
				if (Math.abs(p.vx) + Math.abs(p.vy) > 0.02 || Math.abs(p.x - p.hx) + Math.abs(p.y - p.hy) > 0.2) moving = true
			}
			paint()
			if (moving || mx > -9000) raf = requestAnimationFrame(step)
		}
		const kick = () => { if (!raf) raf = requestAnimationFrame(step) }
		const onMove = (e: PointerEvent) => { const r = el.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; kick() }
		const onLeave = () => { mx = -9999; my = -9999; kick() }
		if (interactive) { el.addEventListener("pointermove", onMove); el.addEventListener("pointerleave", onLeave) }
		const draw = () => {
			if (cancelled || !img.naturalWidth) return
			parts = []
			const W = Math.max(1, el.clientWidth), H = Math.max(1, el.clientHeight)
			const dpr = Math.min(2, window.devicePixelRatio || 1)
			canvas.width = W * dpr; canvas.height = H * dpr
			canvas.style.width = W + "px"; canvas.style.height = H + "px"
			const ctx = canvas.getContext("2d"); if (!ctx) return
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
			ctx.clearRect(0, 0, W, H)
			W0 = W; H0 = H
			const add = (col: string, cx: number, cy: number, size: number, round: boolean) => { parts.push({ hx: cx, hy: cy, x: cx, y: cy, vx: 0, vy: 0, s: size, col, round }) }
			const c = Math.max(2, cell)
			const gw = Math.ceil(W / c), gh = Math.ceil(H / c)
			const off = document.createElement("canvas"); off.width = gw; off.height = gh
			const octx = off.getContext("2d"); if (!octx) return
			// cover-fit the photo into the grid
			const s = Math.max(gw / img.naturalWidth, gh / img.naturalHeight)
			const dw = img.naturalWidth * s, dh = img.naturalHeight * s
			octx.drawImage(img, (gw - dw) / 2, (gh - dh) * focusY, dw, dh)
			let data: Uint8ClampedArray
			try { data = octx.getImageData(0, 0, gw, gh).data } catch { return }
			ctx.fillStyle = ink
			for (let y = 0; y < gh; y++) {
				for (let x = 0; x < gw; x++) {
					const i = (y * gw + x) * 4
					let l = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255
					if (data[i + 3] < 10 || l > cutoff) continue // keep light background clean
					l = (l - 0.5) * contrast + 0.5 + brightness
					const dark = 1 - Math.max(0, Math.min(1, l))
					if (colored) {
						const q = (v: number) => {
							const adj = Math.max(0, Math.min(255, (v / 255 - 0.5) * contrast * 255 + 128 + brightness * 255))
							return Math.round(Math.round(adj / 255 * 5) / 5 * 255)
						}
						ctx.fillStyle = "rgb(" + q(data[i]) + "," + q(data[i + 1]) + "," + q(data[i + 2]) + ")"
						if (interactive) { add(ctx.fillStyle as string, x * c + c / 2, y * c + c / 2, mode === "dots" ? c * 0.5 * (0.6 + 0.4 * dark) : c, mode === "dots"); continue }
						if (mode === "dots") {
							const r = c * 0.5 * (0.6 + 0.4 * dark)
							ctx.beginPath(); ctx.arc(x * c + c / 2, y * c + c / 2, r, 0, Math.PI * 2); ctx.fill()
						} else ctx.fillRect(x * c, y * c, c, c)
						continue
					}
					if (interactive) {
						if (mode === "dots") { const r = Math.sqrt(dark) * c * 0.62; if (r >= 0.35) add(ink, x * c + c / 2, y * c + c / 2, r, true) }
						else { const t = (BAYER[y % 8][x % 8] + 0.5) / 64; if (dark > t) add(ink, x * c + c / 2, y * c + c / 2, c, false) }
						continue
					}
					if (mode === "dots") {
						const r = Math.sqrt(dark) * c * 0.62
						if (r < 0.35) continue
						ctx.beginPath(); ctx.arc(x * c + c / 2, y * c + c / 2, r, 0, Math.PI * 2); ctx.fill()
					} else {
						const t = (BAYER[y % 8][x % 8] + 0.5) / 64
						if (dark > t) ctx.fillRect(x * c, y * c, c, c)
					}
				}
			}
		}
		const drawAll = () => { draw(); if (interactive) paint() }
		img.onload = drawAll
		img.src = src
		const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(drawAll) : null
		ro?.observe(el)
		return () => { cancelled = true; ro?.disconnect(); if (raf) cancelAnimationFrame(raf); el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerleave", onLeave) }
	}, [src, cell, mode, ink, contrast, brightness, cutoff, focusY, colored, interactive])

	return (
		<div ref={box} role="img" aria-label={alt} style={{ ...rootStyle, position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
			<canvas ref={cv} style={{ display: "block", imageRendering: "pixelated", touchAction: interactive ? "pan-y" : undefined }} />
		</div>
	)
}

DitherPortrait.defaultProps = { width: 380, height: 380, cell: 4, look: "pixels", ink: "#1a1814", contrast: 1.3, brightness: 0.05, cutoff: 0.86, focusY: 0.3, alt: "Portrait of Yuezhou (Ingrid) Jiang" }

addPropertyControls(DitherPortrait, {
	image: { type: ControlType.ResponsiveImage, title: "Photo" },
	look: { type: ControlType.Enum, title: "Style", options: ["pixels", "dots"], optionTitles: ["Pixels", "Halftone"], displaySegmentedControl: true },
	cell: { type: ControlType.Number, title: "Grain", min: 2, max: 16, step: 1, unit: "px" },
	colored: { type: ControlType.Boolean, title: "Color", defaultValue: false },
	interactive: { type: ControlType.Boolean, title: "Interactive", defaultValue: false },
	ink: { type: ControlType.Color, title: "Ink", hidden: (p: any) => !!p.colored },
	contrast: { type: ControlType.Number, title: "Contrast", min: 0.5, max: 3, step: 0.05 },
	brightness: { type: ControlType.Number, title: "Brightness", min: -0.5, max: 0.5, step: 0.01 },
	cutoff: { type: ControlType.Number, title: "Clear BG", min: 0.5, max: 1, step: 0.01 },
	focusY: { type: ControlType.Number, title: "Focus Y", min: 0, max: 1, step: 0.05 },
	alt: { type: ControlType.String, title: "Alt text" },
})
