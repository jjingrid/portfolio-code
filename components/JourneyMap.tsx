import { addPropertyControls, ControlType } from "framer"
import { useEffect, useRef, useState } from "react"

/**
 * A small line map of the places I've studied, from London, ON to Toronto.
 * Scales with its width; positions are real longitudes and latitudes.
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */

const DARK = "#1a1814"
const GRAY = "rgba(26,24,20,0.5)"
const VW = 760, VH = 360
// projection window (lon/lat)
const LON0 = -81.75, LON1 = -78.75, LAT0 = 42.55, LAT1 = 44.05
const kx = Math.cos((43.3 * Math.PI) / 180) // keep east-west distances honest
const X = (lon: number) => 30 + ((lon - LON0) / (LON1 - LON0)) * (VW - 60)
const Y = (lat: number) => 20 + ((LAT1 - lat) / (LAT1 - LAT0)) * (VH - 60)

// rough shorelines, simplified
const ONTARIO: [number, number][] = [[-79.88, 43.27], [-79.8, 43.32], [-79.67, 43.43], [-79.58, 43.52], [-79.48, 43.6], [-79.38, 43.63], [-79.2, 43.7], [-79.05, 43.8], [-78.85, 43.86], [-78.5, 43.9], [-78.5, 43.36], [-78.9, 43.34], [-79.06, 43.26], [-79.3, 43.2], [-79.55, 43.2], [-79.76, 43.24]]
const ERIE: [number, number][] = [[-82.0, 42.45], [-81.6, 42.58], [-81.2, 42.66], [-80.9, 42.66], [-80.55, 42.58], [-80.3, 42.72], [-80.0, 42.82], [-79.6, 42.87], [-79.25, 42.88], [-79.0, 42.86], [-78.9, 42.4], [-82.0, 42.4]]
const poly = (pts: [number, number][]) => pts.map(([lo, la], i) => (i ? "L " : "M ") + X(lo).toFixed(1) + " " + Y(la).toFixed(1)).join(" ") + " Z"

const STOPS = [
	{ n: "01", city: "London, ON", school: "Western University", years: "2022–23", lon: -81.27, lat: 43.01, dx: -16, dy: -4, anchor: "end" as const },
	{ n: "02", city: "Mississauga", school: "University of Toronto Mississauga", years: "2023–26", lon: -79.66, lat: 43.55, dx: -20, dy: -62, anchor: "end" as const },
	{ n: "03", city: "Toronto", school: "University of Toronto · MI", years: "2026–", lon: -79.4, lat: 43.66, dx: 16, dy: -50 },
]

export default function JourneyMap(props: any) {
	const { style } = props
	const box = useRef<HTMLDivElement>(null)
	const [k, setK] = useState(1)
	const [narrow, setNarrow] = useState(false)
	useEffect(() => {
		const el = box.current
		if (!el || typeof ResizeObserver === "undefined") return
		const m = () => { const w = el.clientWidth || VW; setNarrow(w < 520); setK(Math.max(1, Math.min(2.1, (VW * 0.62) / w))) }
		const ro = new ResizeObserver(m); ro.observe(el); m()
		return () => ro.disconnect()
	}, [])
	const f = (n: number) => n * k
	const pts = STOPS.map((s) => [X(s.lon), Y(s.lat)])
	const route = "M " + pts[0][0] + " " + pts[0][1] + " C " + (pts[0][0] + 180) + " " + (pts[0][1] - 60) + ", " + (pts[1][0] - 160) + " " + (pts[1][1] - 40) + ", " + pts[1][0] + " " + pts[1][1] + " C " + (pts[1][0] + 40) + " " + (pts[1][1] - 20) + ", " + (pts[2][0] - 30) + " " + (pts[2][1] + 10) + ", " + pts[2][0] + " " + pts[2][1]
	const km50 = (50 / (111 * kx)) / (LON1 - LON0) * (VW - 60)
	return (
		<div ref={box} style={{ ...style, width: "100%", position: "relative" }}>
			<svg viewBox={"0 0 " + VW + " " + VH} style={{ width: "100%", height: "auto", display: "block", overflow: "visible", fontFamily: "'DM Sans', sans-serif" }}>
				<defs><clipPath id="yjFrame"><rect x={0} y={0} width={VW} height={VH} /></clipPath></defs>
				<rect x={0.5} y={0.5} width={VW - 1} height={VH - 1} fill="none" stroke="rgba(26,24,20,0.18)" />
				<g clipPath="url(#yjFrame)">
				<path d={poly(ONTARIO)} fill="rgba(26,24,20,0.05)" stroke="rgba(26,24,20,0.25)" strokeWidth={1} />
				<path d={poly(ERIE)} fill="rgba(26,24,20,0.05)" stroke="rgba(26,24,20,0.25)" strokeWidth={1} />
				<text x={X(-79.3)} y={Y(43.42)} fontSize={f(11)} letterSpacing="0.12em" fill={GRAY} textAnchor="middle">LAKE ONTARIO</text>
				<text x={X(-80.4)} y={Y(42.62)} fontSize={f(11)} letterSpacing="0.12em" fill={GRAY} textAnchor="middle">LAKE ERIE</text>
				</g>
				<path d={route} fill="none" stroke={DARK} strokeWidth={1.6} strokeDasharray="5 6" strokeLinecap="round" />
				{STOPS.map((s, i) => {
					const [x, y] = pts[i]
					const anchor = s.anchor || "start"
					return (
						<g key={s.n}>
							<circle cx={x} cy={y} r={i === STOPS.length - 1 ? 7 : 5.5} fill={i === STOPS.length - 1 ? DARK : "#fff"} stroke={DARK} strokeWidth={2} />
							{i === STOPS.length - 1 && <circle cx={x} cy={y} r={13} fill="none" stroke={DARK} strokeOpacity={0.25} strokeWidth={1} />}
							{narrow ? (
								<text x={x} y={y - f(14)} textAnchor="middle" fontSize={f(11)} letterSpacing="0.06em" fill={DARK}>{s.n}</text>
							) : (
								<>
									<text x={x + s.dx} y={y + s.dy} textAnchor={anchor} fontSize={10.5} letterSpacing="0.08em" fill={GRAY}>{s.n} · {s.years}</text>
									<text x={x + s.dx} y={y + s.dy + 16} textAnchor={anchor} fontSize={14} fill={DARK}>{s.city}</text>
									<text x={x + s.dx} y={y + s.dy + 31} textAnchor={anchor} fontSize={11} fill={GRAY}>{s.school}</text>
								</>
							)}
						</g>
					)
				})}
				{/* scale bar + north arrow */}
				<g transform={"translate(" + (VW - 30 - km50) + "," + (VH - 18) + ")"}>
					<rect x={0} y={0} width={km50 / 2} height={4} fill={DARK} />
					<rect x={km50 / 2} y={0} width={km50 / 2} height={4} fill="#fff" stroke={DARK} strokeWidth={1} />
					<text x={0} y={-6} fontSize={f(9.5)} letterSpacing="0.08em" fill={GRAY}>0</text>
					<text x={km50} y={-6} fontSize={f(9.5)} letterSpacing="0.08em" fill={GRAY} textAnchor="end">50 KM</text>
				</g>
				<g transform={"translate(" + (VW - 30) + ",40)"}>
					<path d="M 0 -16 L 6 4 L 0 0 L -6 4 Z" fill={DARK} />
					<text x={0} y={18} fontSize={f(10)} letterSpacing="0.08em" fill={DARK} textAnchor="middle">N</text>
				</g>
			</svg>
			{narrow && (
				<div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12, fontFamily: "'DM Sans', sans-serif" }}>
					{STOPS.map((s) => (
						<div key={s.n} style={{ display: "flex", gap: 12 }}>
							<span style={{ fontSize: 11, color: GRAY, letterSpacing: "0.08em", paddingTop: 2 }}>{s.n}</span>
							<div>
								<div style={{ fontSize: 14, color: DARK }}>{s.city} <span style={{ color: GRAY, fontSize: 12 }}>· {s.years}</span></div>
								<div style={{ fontSize: 12, color: GRAY, marginTop: 2 }}>{s.school}</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

JourneyMap.defaultProps = { width: 760 }
addPropertyControls(JourneyMap, {})
