import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// Fan geometry of the sleeve dieline image, measured on a 1040px-wide copy.
// A paper-cup sleeve is an unrolled cone, so the same fan wraps back into a tapered coffee cup.
const G = { w: 1040, cx: 540, cy: 1631, rt: 1599, rb: 1372, a0: -0.2668, a1: 0.2866 }

/**
 * The flat sleeve dieline wraps onto a coffee cup as the page scrolls, then turns slowly. Drag to spin.
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function SleeveWrap(props) {
    const { dieline, cupColor, lidColor, slices } = props
    const tex = typeof dieline === "string" ? dieline : dieline && dieline.src
    const box = React.useRef(null)
    const strips = React.useRef([])
    const boxes = React.useRef([])
    const shades = React.useRef([])
    const bodies = React.useRef([])
    const rims = React.useRef([])
    const domes = React.useRef([])
    const lidTop = React.useRef(null)
    const cupGroup = React.useRef(null)
    const domeTop = React.useRef(null)
    const [size, setSize] = React.useState({ w: 640, h: 440 })
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const N = Math.max(16, Math.min(72, Math.round(slices)))

    React.useEffect(() => {
        const el = box.current
        if (!el) return
        const ro = new ResizeObserver(() => setSize({ w: el.clientWidth || 640, h: el.clientHeight || 440 }))
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const toRgb = (col, fb) => {
        const s = String(col || "").trim()
        const m = s.match(/rgba?\(([^)]+)\)/)
        if (m) { const v = m[1].split(",").map((x) => parseFloat(x)); if (v.length >= 3 && v.every((x, i) => i > 2 || !isNaN(x))) return [v[0], v[1], v[2]] }
        const h = s.replace("#", "")
        if (/^[0-9a-f]{3}$|^[0-9a-f]{6}/i.test(h)) { const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h.slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
        return fb
    }
    const cupRgb = toRgb(cupColor, [246, 243, 238]), lidRgb = toRgb(lidColor, [29, 29, 31])
    const tint = (rgb, f) => "rgb(" + Math.min(255, rgb[0] * f) + "," + Math.min(255, rgb[1] * f) + "," + Math.min(255, rgb[2] * f) + ")"
    // ---- geometry (px) ----
    const D = G.a1 - G.a0
    const s = props.mode === "showcase"
        ? Math.max(0.05, Math.min((size.w * 0.5 * Math.PI) / (1.12 * D * G.rt), (size.h * 0.3) / (G.rt - G.rb)))
        : Math.max(0.05, Math.min((size.w * 0.84) / (2 * G.rt * Math.sin(D / 2)), (size.h * 0.3) / (G.rt - G.rb)))
    const H = (G.rt - G.rb) * s                 // sleeve height along the cup wall
    const dphi = D / N
    const wt = dphi * G.rt * s                  // slice width at the top edge
    const wb = wt * (G.rb / G.rt)               // ...and at the bottom edge
    const Rtop = (D * G.rt * s) / (2 * Math.PI) // cone radius at sleeve top once wrapped
    const Rbot = Rtop * (G.rb / G.rt)
    const k = (Rtop - Rbot) / H                 // taper per px of height
    const alpha = Math.asin(Math.min(0.9, k)) * 180 / Math.PI
    const Rmid = (Rtop + Rbot) / 2
    const fanMid = ((G.rt + G.rb) / 2) * s
    // cup body around the sleeve
    const above = H * 0.62, below = H * 0.48
    const Hb = H + above + below
    const rCupTop = Rtop - 1 + above * k, rCupBot = Rtop - 1 - (H + below) * k
    const rCupMid = (rCupTop + rCupBot) / 2
    const bodyCenterY = (-H / 2 - above + H / 2 + below) / 2
    const cwt = (2 * Math.PI * rCupTop) / N + 2, cwb = (2 * Math.PI * rCupBot) / N + 2
    const lidY = -H / 2 - above

    // paint each slice of the curved artwork, rotated so the slice runs straight up
    React.useEffect(() => {
        if (!tex) return
        const img = new Image()
        img.onload = () => {
            const dpr = Math.min(2, window.devicePixelRatio || 1)
            const ih = (G.w * img.naturalHeight) / img.naturalWidth
            strips.current.forEach((cv, i) => {
                if (!cv) return
                cv.width = Math.ceil((wt + 3) * dpr); cv.height = Math.ceil(H * dpr)
                const ctx = cv.getContext("2d")
                const phi = G.a0 + (i + 0.5) * dphi
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
                ctx.translate((wt + 3) / 2, G.rt * s)
                ctx.scale(s, s)
                ctx.rotate(-phi)
                ctx.translate(-G.cx, -G.cy)
                ctx.drawImage(img, 0, 0, G.w, ih)
            })
        }
        img.src = tex
    }, [tex, N, wt, H, s])

    const [state, setState] = React.useState("flat") // flat | wrapped | busy
    const touched = React.useRef(false)
    const [hintOn, setHintOn] = React.useState(true)

    React.useEffect(() => {
        const el = box.current
        const deg = 180 / Math.PI
        let raf = 0, p = 0, target = null, from = 0, t0 = 0, rot = 0, vel = 0, drag = false, lastX = 0, startX = 0, moved = 0
        const draw = () => {
            const R = rot * p * p * (3 - 2 * p) // turn the whole cup + sleeve about the cup's own axis
            strips.current.forEach((sEl, i) => {
                if (!sEl) return
                const phi = G.a0 + (i + 0.5) * dphi
                const phiC = phi - (G.a0 + G.a1) / 2
                const fx = fanMid * Math.sin(phiC), fy = fanMid * (1 - Math.cos(phiC))
                const th = (i - N / 2 + 0.5) * (360 / N)
                const bx = boxes.current[i]; if (!bx) return
                // bend the whole sleeve around one circle whose radius shrinks as p grows,
                // so neighbouring slices always meet (no venetian-blind gaps mid-way)
                const pb = Math.max(0.0015, p)
                const rho = Rmid / pb
                const u = (i - N / 2 + 0.5) * ((2 * Math.PI * Rmid) / N)
                const ang = (u / rho) * deg + R
                const zc = -rho + Rmid + (1 - p) * (1 - p) * Rmid * 0.9
                bx.style.transform = "translateY(" + (1 - p) * fy + "px) rotateY(" + R + "deg) translateZ(" + zc + "px) rotateY(" + (u / rho) * deg + "deg) translateZ(" + rho + "px) rotateZ(" + (1 - p) * phiC * deg + "deg) rotateX(" + p * -alpha + "deg)"
                const half = 180 / N
                const lit = (a) => 0.78 + 0.22 * Math.cos((a * Math.PI) / 180)
                const sh = shades.current[i]
                if (sh) { sh.style.opacity = String(p); sh.style.background = "linear-gradient(to right, rgba(0,0,0," + (1 - lit(ang - half * p)) + "), rgba(0,0,0," + (1 - lit(ang + half * p)) + "))" }
                bx.style.backfaceVisibility = p > 0.85 ? "hidden" : "visible"
            })
            const fk = Math.min(1, p / 0.7), op = String(fk * fk * (3 - 2 * fk))
            const g = cupGroup.current
            if (g) { g.style.visibility = p > 0.001 ? "visible" : "hidden" }
            bodies.current.forEach((b, i) => {
                if (!b) return
                const th = (i * 360) / N + R
                b.style.transform = "translateY(" + bodyCenterY + "px) rotateY(" + th + "deg) translateZ(" + rCupMid + "px) rotateX(" + -alpha + "deg)"
                b.style.opacity = op
                { const h2 = 180 / N; b.style.background = "linear-gradient(to right, " + tint(cupRgb, 0.82 + 0.18 * Math.cos(((th - h2) * Math.PI) / 180)) + ", " + tint(cupRgb, 0.82 + 0.18 * Math.cos(((th + h2) * Math.PI) / 180)) + ")" }
            })
            rims.current.forEach((r, i) => { if (r) { const th = (i * 360) / N + R; r.style.transform = "translateY(" + (lidY - 5) + "px) rotateY(" + th + "deg) translateZ(" + (rCupTop + 4) + "px)"; r.style.opacity = op; r.style.background = "linear-gradient(to right, " + tint(lidRgb, 0.8 + 0.3 * Math.cos(((th - 180 / N) * Math.PI) / 180)) + ", " + tint(lidRgb, 0.8 + 0.3 * Math.cos(((th + 180 / N) * Math.PI) / 180)) + ")" } })
            domes.current.forEach((r, i) => { if (r) { const th = (i * 360) / N + R; r.style.transform = "translateY(" + (lidY - 15) + "px) rotateY(" + th + "deg) translateZ(" + (rCupTop * 0.8) + "px)"; r.style.opacity = op; r.style.background = "linear-gradient(to right, " + tint(lidRgb, 0.8 + 0.3 * Math.cos(((th - 180 / N) * Math.PI) / 180)) + ", " + tint(lidRgb, 0.8 + 0.3 * Math.cos(((th + 180 / N) * Math.PI) / 180)) + ")" } })
            if (lidTop.current) { lidTop.current.style.opacity = op; lidTop.current.style.transform = "translateY(" + (lidY - 11) + "px) rotateX(90deg) rotateZ(" + -R + "deg)" }
            if (domeTop.current) { domeTop.current.style.opacity = op; domeTop.current.style.transform = "translateY(" + (lidY - 19) + "px) rotateX(90deg) rotateZ(" + -R + "deg)" }
        }
        const loop = () => {
            raf = 0
            let again = false
            if (target !== null) {
                const dur = Math.max(500, Math.abs(target - from) * props.duration * 1000)
                const f = Math.min(1, (performance.now() - t0) / dur)
                const e = f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2
                p = from + (target - from) * e
                if (f >= 1) { p = target; target = null; if (p === 0) rot = 0; setState(p > 0.5 ? "wrapped" : "flat") } else again = true
            }
            if (!drag && Math.abs(vel) > 0.05) { vel *= 0.93; rot += vel; again = true }
            draw()
            if (again) raf = requestAnimationFrame(loop)
        }
        const kick = () => { if (!raf) raf = requestAnimationFrame(loop) }
        const animateTo = (to) => { vel = 0; rot = ((rot % 360) + 540) % 360 - 180; from = p; target = to; t0 = performance.now(); kick() }
        const first = () => { if (!touched.current) { touched.current = true; setHintOn(false) } }
        const down = (e) => { drag = true; lastX = startX = e.clientX; moved = 0; vel = 0; el.setPointerCapture(e.pointerId) }
        const move = (e) => {
            if (!drag) return
            const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx)
            if (moved < 4) return
            first()
            if (p < 1 || target !== null) { target = null; p = Math.max(0, Math.min(1, p + dx / 340)); if (p === 0) rot = 0 }
            else { vel = dx * 0.5; rot += vel }
            draw()
        }
        const up = () => {
            if (!drag) return
            drag = false
            if (moved < 4) { first(); setState("busy"); animateTo(p > 0.5 ? 0 : 1); return }
            if (p > 0 && p < 1) { animateTo(p > 0.5 ? 1 : 0) } else { setState(p > 0.5 ? "wrapped" : "flat"); kick() }
        }
        if (props.mode === "showcase") {
            p = 1
            const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
            let last = performance.now()
            const spin = (t) => { const dt = Math.min(0.05, (t - last) / 1000); last = t; if (!reduce && !isCanvas) rot += dt * props.spinSpeed; draw(); raf = visible ? requestAnimationFrame(spin) : 0 }
            let visible = true
            const io = new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(spin) } })
            io.observe(el)
            const spin2 = spin
            raf = requestAnimationFrame(spin2)
            return () => { cancelAnimationFrame(raf); io.disconnect() }
        }
        const key = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); first(); animateTo(p > 0.5 ? 0 : 1) } }
        el.addEventListener("pointerdown", down); el.addEventListener("pointermove", move)
        el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up); el.addEventListener("keydown", key)
        draw()
        return () => { cancelAnimationFrame(raf); el.removeEventListener("pointerdown", down); el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); el.removeEventListener("keydown", key) }
    }, [N, wt, H, s, isCanvas, Rmid, alpha, rCupMid, rCupTop, lidY, bodyCenterY, props.duration, props.mode, props.spinSpeed])

    const base: React.CSSProperties = { position: "absolute", transformStyle: "preserve-3d", backfaceVisibility: "hidden" }
    const trap = (top, bot) => "polygon(0 0, 100% 0, " + (top / 2 + bot / 2) + "px 100%, " + (top / 2 - bot / 2) + "px 100%)"
    // slices overlap their neighbours by a few px; at the seam that overlap would show the glue strip, so trim it there
    const seamClip = (i) => {
        const W = wt + 3, bl = (W - (wb + 3)) / 2, cut = 0.6
        const l = i === 0 ? cut : 0, r = i === N - 1 ? cut : 0
        return "polygon(" + l + "px 0, " + (W - r) + "px 0, " + (W - bl - r * (wb / wt)) + "px 100%, " + (bl + l * (wb / wt)) + "px 100%)"
    }
    const lidR = rCupTop + 5, domeR = rCupTop * 0.8
    return (
        <div ref={box} role={props.mode === "showcase" ? "img" : "button"} tabIndex={props.mode === "showcase" ? -1 : 0} aria-label={props.mode === "showcase" ? props.alt : props.alt + ". Drag or press Enter to wrap and unwrap the sleeve."} style={{ position: "relative", width: "100%", height: "100%", perspective: 1100, display: "grid", placeItems: "center", cursor: props.mode === "showcase" ? "default" : "grab", touchAction: "pan-y", userSelect: "none", outline: "none" }}>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 4, display: "flex", justifyContent: "center", alignItems: "center", gap: 8, font: "500 12px/1.4 'DM Sans', system-ui, sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "#6f6c66", pointerEvents: "none", transition: "opacity .4s ease", opacity: props.mode === "showcase" ? 0 : hintOn || state !== "busy" ? 1 : 0 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C2456E", animation: hintOn ? "swPulse 1.6s ease-in-out infinite" : "none" }} />
                {state === "wrapped" ? props.hintWrapped : props.hintFlat}
                <style>{"@keyframes swPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.8);opacity:.35}}"}</style>
            </div>
            <div style={{ position: "relative", width: 0, height: 0, transformStyle: "preserve-3d", transform: "translateY(" + H * 0.12 + "px) rotateX(-14deg)" }}>
                <div ref={cupGroup} style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, transformStyle: "preserve-3d", visibility: "hidden" }}>
                <div ref={lidTop} style={{ ...base, backfaceVisibility: "visible", width: 2 * lidR, height: 2 * lidR, left: -lidR, top: -lidR, borderRadius: "50%", background: lidColor, boxShadow: "inset 0 0 0 3px rgba(255,255,255,.08)" }} />
                <div ref={domeTop} style={{ ...base, backfaceVisibility: "visible", width: 2 * domeR, height: 2 * domeR, left: -domeR, top: -domeR, borderRadius: "50%", background: "radial-gradient(ellipse 14% 7% at 50% 16%, #000 70%, transparent 74%), radial-gradient(circle at 45% 40%, #3a3a3c, " + lidColor + " 72%)" }} />
                {Array.from({ length: N }).map((_, i) => (
                    <div key={"d" + i} ref={(el) => { domes.current[i] = el }} style={{ ...base, left: -((2 * Math.PI * domeR) / N + 2) / 2, top: -4, width: (2 * Math.PI * domeR) / N + 2, height: 8, background: lidColor }} />
                ))}
                {Array.from({ length: N }).map((_, i) => (
                    <div key={"r" + i} ref={(el) => { rims.current[i] = el }} style={{ ...base, left: -((2 * Math.PI * lidR) / N + 2) / 2, top: -7, width: (2 * Math.PI * lidR) / N + 2, height: 14, background: lidColor }} />
                ))}
                {Array.from({ length: N }).map((_, i) => (
                    <div key={"b" + i} ref={(el) => { bodies.current[i] = el }} style={{ ...base, left: -cwt / 2, top: -Hb / 2, width: cwt, height: Hb, background: cupColor, clipPath: trap(cwt, cwb) }} />
                ))}
                </div>
                {Array.from({ length: N }).map((_, i) => (
                    <div key={"s" + i} ref={(el) => { boxes.current[i] = el }} style={{ ...base, backfaceVisibility: "visible", left: -(wt + 3) / 2, top: -H / 2, width: wt + 3, height: H, clipPath: seamClip(i), willChange: "transform" }}>
                        <canvas ref={(el) => { strips.current[i] = el }} style={{ display: "block", width: "100%", height: "100%" }} />
                        <div ref={(el) => { shades.current[i] = el }} style={{ position: "absolute", inset: 0 }} />
                    </div>
                ))}
            </div>
        </div>
    )
}

SleeveWrap.defaultProps = { mode: "interactive", spinSpeed: 24, duration: 2.8, hintFlat: "Drag or click to wrap the sleeve", hintWrapped: "Drag to turn the cup · Click to unwrap", cupColor: "#F6F3EE", lidColor: "#1d1d1f", slices: 36, alt: "Common Ground coffee sleeve wrapping onto a coffee cup" }

addPropertyControls(SleeveWrap, {
    mode: { type: ControlType.Enum, title: "Mode", options: ["interactive", "showcase"], optionTitles: ["Drag to wrap", "Spinning on cup"] },
    spinSpeed: { type: ControlType.Number, title: "Spin", min: 4, max: 90, unit: "°/s", hidden: (p) => p.mode !== "showcase" },
    dieline: { type: ControlType.Image, title: "Dieline" },
    cupColor: { type: ControlType.Color, title: "Cup" },
    lidColor: { type: ControlType.Color, title: "Lid" },
    slices: { type: ControlType.Number, title: "Smoothness", min: 16, max: 72, step: 4 },
    duration: { type: ControlType.Number, title: "Wrap speed", min: 0.5, max: 6, step: 0.1, unit: "s" },
    hintFlat: { type: ControlType.String, title: "Hint (flat)" },
    hintWrapped: { type: ControlType.String, title: "Hint (cup)" },
    alt: { type: ControlType.String, title: "Alt" },
})
