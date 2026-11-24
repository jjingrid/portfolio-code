import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useEffect, useMemo, useRef, useState } from "react"

/**
 * Project map: the projects drawn as stops on a transit line over a faint contour map.
 * Clicking a stop opens the same pop-up as the matching project card on the page.
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */

const DARK = "#1a1814"
const GRAY = "rgba(26,24,20,0.5)"
const DESIGN_H = 800
const STOPS = [
	{ n: "01", label: "Hello", sub: "About me", target: "Hello", key: "hello", coord: "43.6629° N, 79.3957° W" },
	{ n: "02", label: "UX Design", sub: "Appointment Booking App", target: "Appointment booking research", key: "ux", coord: "43.6596° N, 79.3972° W" },
	{ n: "03", label: "Brand Design", sub: "Common Ground", target: "Common Ground (DesignJam)", key: "cg", coord: "43.6577° N, 79.3788° W" },
	{ n: "04", label: "Game Design", sub: "Twin Paths of Fate", target: "Twin Paths of Fate", key: "tp", coord: "43.5483° N, 79.6627° W" },
	{ n: "05", label: "Marketing", sub: "Gemina", target: "Gemina", key: "gemina", coord: "43.6426° N, 79.3871° W" },
	{ n: "06", label: "GIS & Data", sub: "Mapping work", target: "Mapping work", key: "gis", coord: "43.6532° N, 79.3832° W" },
]
const X0 = 300, DX = 450
const HIGH = 250, LOW = 575
const W = X0 + DX * STOPS.length + 420

function stopPos(i: number) { return { x: X0 + i * DX, y: i % 2 === 0 ? HIGH : LOW } }

function routePath(n: number) {
	let d = ""
	for (let i = 0; i < n; i++) {
		const p = stopPos(i)
		if (i === 0) { d = "M " + (p.x - 220) + " " + p.y + " L " + p.x + " " + p.y; continue }
		const q = stopPos(i - 1)
		// stay level past each card, then bend to the next level
		const a = q.x + 125, b = p.x - 125, mx = (a + b) / 2
		d += " L " + a + " " + q.y + " C " + mx + " " + q.y + ", " + mx + " " + p.y + ", " + b + " " + p.y + " L " + p.x + " " + p.y
	}
	return d
}

function contours() {
	const centers = [ [520, 420, 1.3], [1250, 180, 1], [1900, 640, 1.2], [2600, 300, 0.9], [120, 760, 0.8] ]
	const out: string[] = []
	centers.forEach(([cx, cy, sc], ci) => {
		for (let k = 1; k <= 9; k++) {
			const r = k * 46 * (sc as number)
			let d = ""
			for (let a = 0; a <= 72; a++) {
				const t = (a / 72) * Math.PI * 2
				const rr = r * (1 + 0.13 * Math.sin(3 * t + ci * 1.7 + k * 0.15) + 0.06 * Math.sin(5 * t + ci))
				const x = (cx as number) + rr * Math.cos(t) * 1.35
				const y = (cy as number) + rr * Math.sin(t)
				d += (a === 0 ? "M " : " L ") + x.toFixed(1) + " " + y.toFixed(1)
			}
			out.push(d + " Z")
		}
	})
	return out
}

function openCard(name: string) {
	if (typeof document === "undefined") return
	const all = Array.from(document.querySelectorAll('[data-framer-name="' + name + '"]')) as HTMLElement[]
	const el = all.find((e) => e.getClientRects().length > 0) || all[0]
	el?.click()
}

export default function ProjectMap(props: any) {
	const { hello, ux, cg, tp, gemina, gis, style } = props
	const images: Record<string, any> = { hello, ux, cg, tp, gemina, gis }
	const wrap = useRef<HTMLDivElement>(null)
	const [h, setH] = useState(DESIGN_H)
	const [hover, setHover] = useState(-1)
	const onCanvas = RenderTarget.current() === RenderTarget.canvas
	const lines = useMemo(contours, [])
	const route = useMemo(() => routePath(STOPS.length), [])
	const last = stopPos(STOPS.length - 1)

	useEffect(() => {
		const el = wrap.current
		if (!el || typeof ResizeObserver === "undefined") return
		const ro = new ResizeObserver(() => setH(el.clientHeight || DESIGN_H))
		ro.observe(el)
		setH(el.clientHeight || DESIGN_H)
		return () => ro.disconnect()
	}, [])

	// vertical wheel moves along the map; scrolling up at the start brings the opening screen back
	useEffect(() => {
		const el = wrap.current
		if (!el || onCanvas) return
		let target = el.scrollLeft, anim = 0, back = 0, backT: any = 0
		const step = () => {
			const diff = target - el.scrollLeft
			if (Math.abs(diff) < 0.5) { el.scrollLeft = target; anim = 0; return }
			el.scrollLeft += diff * 0.14
			anim = requestAnimationFrame(step)
		}
		const locked = () => getComputedStyle(document.documentElement).overflow === "hidden" || getComputedStyle(document.body).overflow === "hidden"
		const onWheel = (e: WheelEvent) => {
			if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || locked()) return
			if (Date.now() - ((window as any).__yjLiftAt || 0) < 1400) { e.preventDefault(); return }
			const max = el.scrollWidth - el.clientWidth
			if (!anim) target = el.scrollLeft
			if (e.deltaY < 0 && target <= 0) {
				if (Date.now() - ((window as any).__yjLiftAt || 0) > 1200) {
					clearTimeout(backT); backT = setTimeout(() => { back = 0 }, 250)
					back += -e.deltaY
					if (back > 80) { back = 0; e.preventDefault(); window.dispatchEvent(new Event("yj-intro-back")) }
				}
				return
			}
			if (e.deltaY > 0 && target >= max - 1) return
			e.preventDefault()
			target = Math.max(0, Math.min(max, target + (e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY) * 1.4))
			if (!anim) anim = requestAnimationFrame(step)
		}
		const onReset = () => { el.scrollLeft = 0; target = 0 }
		window.addEventListener("wheel", onWheel, { passive: false })
		window.addEventListener("yj-strip-reset", onReset)
		return () => { window.removeEventListener("wheel", onWheel); window.removeEventListener("yj-strip-reset", onReset); if (anim) cancelAnimationFrame(anim); clearTimeout(backT) }
	}, [onCanvas])

	const s = Math.max(0.62, Math.min(1.25, h / DESIGN_H))
	const px = (v: number) => v * s
	const cardW = 210, cardH = 280

	return (
		<div ref={wrap} style={{ ...style, position: "relative", width: "100%", height: "100%", overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none" as any, background: "#fff" }}>
			<div style={{ position: "relative", width: px(W), height: "100%" }}>
				<svg width={px(W)} height={px(DESIGN_H)} viewBox={"0 0 " + W + " " + DESIGN_H} style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", overflow: "visible" }}>
					{lines.map((d, i) => <path key={i} d={d} fill="none" stroke={DARK} strokeOpacity={0.055} strokeWidth={1} />)}
					<path d={"M " + last.x + " " + last.y + " L " + (last.x + 125) + " " + last.y} fill="none" stroke={DARK} strokeWidth={3} />
					<path d={route} fill="none" stroke={DARK} strokeWidth={3} strokeLinecap="round" />
					<path d={"M " + (last.x + 125) + " " + last.y + " C " + (last.x + 250) + " " + last.y + ", " + (last.x + 250) + " " + HIGH + ", " + (last.x + 380) + " " + HIGH} fill="none" stroke={DARK} strokeWidth={3} strokeDasharray="2 10" strokeLinecap="round" />
					{STOPS.map((st, i) => { const p = stopPos(i); return <circle key={i} cx={p.x} cy={p.y} r={hover === i ? 12 : 9} fill={hover === i ? DARK : "#fff"} stroke={DARK} strokeWidth={3} style={{ transition: "all 0.2s" }} /> })}
					<circle cx={last.x + 380} cy={HIGH} r={6} fill="#fff" stroke={DARK} strokeWidth={2} strokeDasharray="2 3" />
				</svg>

				{STOPS.map((st, i) => {
					const p = stopPos(i)
					const top = p.y === HIGH
					const img = images[st.key]
					const src = img && (img.src || img)
					const cardTop = top ? p.y + 36 : p.y - 36 - cardH
					const labelTop = top ? p.y - 66 : p.y + 24
					const off = (h - px(DESIGN_H)) / 2
					return (
						<div key={st.key}>
							<div style={{ position: "absolute", left: px(p.x - 120), top: off + px(labelTop), width: px(240), textAlign: "center", fontFamily: "'DM Sans', sans-serif", pointerEvents: "none" }}>
								<div style={{ fontSize: px(11), letterSpacing: "0.08em", textTransform: "uppercase", color: GRAY, fontWeight: 500 }}>{st.n} · {st.label}</div>
								<div style={{ fontSize: px(10), color: GRAY, marginTop: px(4), fontVariantNumeric: "tabular-nums", opacity: 0.8 }}>{st.coord}</div>
							</div>
							<div
								onClick={() => openCard(st.target)}
								onMouseEnter={() => setHover(i)}
								onMouseLeave={() => setHover(-1)}
								style={{ position: "absolute", left: px(p.x - cardW / 2), top: off + px(cardTop), width: px(cardW), height: px(cardH), cursor: "pointer", borderRadius: 2, overflow: "hidden", background: st.key === "hello" ? DARK : "#efefec", backgroundImage: src ? "url(" + src + ")" : undefined, backgroundSize: "cover", backgroundPosition: "center", boxShadow: hover === i ? "0 18px 40px rgba(0,0,0,0.18)" : "0 2px 10px rgba(0,0,0,0.06)", transform: hover === i ? "translateY(" + (top ? 6 : -6) + "px) scale(1.04)" : "none", transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s" }}
							>
								{st.key === "hello" && !src && <div style={{ position: "absolute", left: px(20), bottom: px(18), color: "#fff", fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 500, fontSize: px(40), letterSpacing: "-0.03em" }}>Hello.</div>}
								<div style={{ position: "absolute", left: px(10), right: px(10), bottom: px(10), padding: px(12) + "px " + px(14) + "px", background: DARK, color: "#fff", fontFamily: "'DM Sans', sans-serif", opacity: hover === i ? 1 : 0, transform: hover === i ? "none" : "translateY(8px)", transition: "all 0.3s" }}>
									<div style={{ fontSize: px(10), letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.7 }}>{st.label}</div>
									<div style={{ fontSize: px(16), marginTop: px(3) }}>{st.sub}</div>
								</div>
							</div>
						</div>
					)
				})}

				<div style={{ position: "absolute", left: px(last.x + 280), top: (h - px(DESIGN_H)) / 2 + px(HIGH + 30), width: px(220), fontFamily: "'DM Sans', sans-serif", color: DARK }}>
					<div style={{ fontSize: px(11), letterSpacing: "0.08em", textTransform: "uppercase", color: GRAY, fontWeight: 500 }}>07 · And more</div>
					<div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 500, fontSize: px(26), letterSpacing: "-0.03em", lineHeight: 1.05, marginTop: px(8) }}>The map isn’t finished yet.</div>
					<div style={{ fontSize: px(13), color: GRAY, marginTop: px(8) }}>Next stop: under construction.</div>
				</div>

				<div style={{ position: "absolute", left: px(40), bottom: px(28), fontFamily: "'DM Sans', sans-serif", fontSize: px(10), letterSpacing: "0.08em", textTransform: "uppercase", color: GRAY, display: "flex", gap: px(18), alignItems: "center" }}>
					<span style={{ display: "inline-flex", alignItems: "center", gap: px(6) }}><span style={{ width: px(10), height: px(10), borderRadius: "50%", border: "2px solid " + DARK, display: "inline-block" }} />Stop</span>
					<span style={{ display: "inline-flex", alignItems: "center", gap: px(6) }}><span style={{ width: px(22), height: 3, background: DARK, display: "inline-block" }} />Route</span>
					<span style={{ display: "inline-flex", alignItems: "center", gap: px(6) }}><span style={{ width: px(22), borderTop: "3px dotted " + DARK, display: "inline-block" }} />In progress</span>
				</div>
			</div>
		</div>
	)
}

ProjectMap.defaultProps = { width: 1200, height: 800 }

addPropertyControls(ProjectMap, {
	hello: { type: ControlType.ResponsiveImage, title: "01 Hello" },
	ux: { type: ControlType.ResponsiveImage, title: "02 UX" },
	cg: { type: ControlType.ResponsiveImage, title: "03 Brand" },
	tp: { type: ControlType.ResponsiveImage, title: "04 Game" },
	gemina: { type: ControlType.ResponsiveImage, title: "05 Marketing" },
	gis: { type: ControlType.ResponsiveImage, title: "06 GIS" },
})
