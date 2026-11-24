import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * Crops a logo-system grid (columns = colorways, rows = lockups) and cycles through colorways.
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function LogoCycle(props) {
    const { image, cols, rows, seconds, gap, tileRatio, zoom } = props
    const z = Math.max(1, zoom || 1)
    // play order of the colorway columns, e.g. "1,3,2,4"
    const seq = React.useMemo(() => {
        const s = String(props.order || "").split(/[^0-9]+/).filter(Boolean).map((v) => parseInt(v, 10) - 1).filter((v) => v >= 0 && v < cols)
        return s.length ? s : Array.from({ length: cols }, (_, i) => i)
    }, [props.order, cols])
    const src = typeof image === "string" ? image : image && image.src
    const [c, setC] = React.useState(0)
    // the source grid isn't perfectly even, so find where each logo actually sits and centre on it
    const [centers, setCenters] = React.useState(null)
    React.useEffect(() => {
        if (!src) return
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
            try {
                const W = 900, H = Math.round((W * img.naturalHeight) / img.naturalWidth)
                const cv = document.createElement("canvas"); cv.width = W; cv.height = H
                const ctx = cv.getContext("2d"); ctx.drawImage(img, 0, 0, W, H)
                const d = ctx.getImageData(0, 0, W, H).data
                const out = {}
                for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
                    const x0 = Math.floor((k / cols) * W), x1 = Math.floor(((k + 1) / cols) * W)
                    const y0 = Math.floor((r / rows) * H), y1 = Math.floor(((r + 1) / rows) * H)
                    const ix = Math.round((x1 - x0) * 0.08), iy = Math.round((y1 - y0) * 0.08)
                    const bi = ((y0 + iy) * W + (x0 + ix)) * 4
                    const br = d[bi], bg = d[bi + 1], bb = d[bi + 2]
                    let mx = 1e9, my = 1e9, Mx = -1, My = -1
                    for (let y = y0 + iy; y < y1 - iy; y++) for (let x = x0 + ix; x < x1 - ix; x++) {
                        const i = (y * W + x) * 4
                        if (Math.abs(d[i] - br) + Math.abs(d[i + 1] - bg) + Math.abs(d[i + 2] - bb) > 90) { if (x < mx) mx = x; if (x > Mx) Mx = x; if (y < my) my = y; if (y > My) My = y }
                    }
                    if (Mx > 0) out[r + "," + k] = [(mx + Mx) / 2 / W, (my + My) / 2 / H]
                }
                setCenters(out)
            } catch (e) {}
        }
        img.src = src
    }, [src, rows, cols])
    const at = (r, k) => {
        const m = centers && centers[r + "," + k]
        if (!m) return pos(cols, k) + "% " + pos(rows, r) + "%"
        const px = cols * z === 1 ? 50 : ((0.5 - m[0] * cols * z) / (1 - cols * z)) * 100
        const py = rows * z === 1 ? 50 : ((0.5 - m[1] * rows * z) / (1 - rows * z)) * 100
        return px + "% " + py + "%"
    }
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    React.useEffect(() => {
        if (isCanvas) return
        if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
        const id = setInterval(() => setC((v) => (v + 1) % seq.length), seconds * 1000)
        return () => clearInterval(id)
    }, [seq.length, seconds, isCanvas])
    // crop one tile out of the grid, zoomed around its centre
    const pos = (n, i) => { const t = n * z; return t <= 1 ? 50 : (((i + 0.5) / n) * t - 0.5) / (t - 1) * 100 }
    return (
        <div style={{ width: "100%" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(" + rows + ", minmax(0, 1fr))", gap }}>
                {Array.from({ length: rows }).map((_, r) => (
                    <div key={r} style={{ position: "relative", aspectRatio: String(tileRatio), overflow: "hidden" }}>
                        {src && Array.from({ length: cols }).map((_, k) => (
                            <div key={k} role={k === seq[c % seq.length] && r === 0 ? "img" : undefined} aria-label={k === seq[c % seq.length] && r === 0 ? props.alt : undefined}
                                style={{ position: "absolute", inset: 0, backgroundImage: "url(" + src + ")", backgroundSize: cols * z * 100 + "% " + rows * z * 100 + "%", backgroundPosition: at(r, k), opacity: k === seq[c % seq.length] ? 1 : 0, transition: "opacity 1s ease" }} />
                        ))}
                    </div>
                ))}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
                {seq.map((_, k) => (
                    <button key={k} aria-label={"Colorway " + (k + 1)} onClick={() => setC(k)} style={{ width: 7, height: 7, padding: 0, border: 0, borderRadius: "50%", background: k === c % seq.length ? "#1a1814" : "#d6d3cd", cursor: "pointer", transition: "background .3s ease" }} />
                ))}
            </div>
        </div>
    )
}

LogoCycle.defaultProps = { zoom: 1, cols: 4, rows: 3, seconds: 1.8, gap: 12, tileRatio: 1.34, alt: "Common Ground logo system" }

addPropertyControls(LogoCycle, {
    image: { type: ControlType.Image, title: "Grid image" },
    cols: { type: ControlType.Number, title: "Colorways", min: 1, max: 8, step: 1, displayStepper: true },
    rows: { type: ControlType.Number, title: "Lockups", min: 1, max: 6, step: 1, displayStepper: true },
    seconds: { type: ControlType.Number, title: "Every", min: 0.5, max: 10, step: 0.1, unit: "s" },
    gap: { type: ControlType.Number, title: "Gap", min: 0, max: 60 },
    zoom: { type: ControlType.Number, title: "Zoom", min: 1, max: 3, step: 0.05 },
    tileRatio: { type: ControlType.Number, title: "Tile ratio", min: 0.5, max: 3, step: 0.01 },
    order: { type: ControlType.String, title: "Order", placeholder: "1,2,3,4" },
    alt: { type: ControlType.String, title: "Alt" },
})
