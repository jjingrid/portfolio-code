import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function ScrollRoute(props) {
    const { color, endInset, startX, target, accent, fromTop, fromEdge } = props
    const [edgeX, setEdgeX] = React.useState(0)
    const headRef = React.useRef<HTMLElement | null>(null)
    const arrivedRef = React.useRef(false)
    const [arrived, setArrived] = React.useState(false)
    const [kx, setKx] = React.useState<number | null>(null)
    const [ky, setKy] = React.useState<number | null>(null)
    const ref = React.useRef<HTMLDivElement>(null)
    const [size, setSize] = React.useState({ w: 1200, h: 300 })
    const [t, setT] = React.useState(0)
    const pathRef = React.useRef<SVGPathElement>(null)
    const maskId = React.useMemo(() => "sr-mask-" + Math.random().toString(36).slice(2, 8), [])
    const [len, setLen] = React.useState(2000)

    React.useEffect(() => {
        const el = ref.current
        if (!el) return
        const measure = () => {
            const r = el.getBoundingClientRect()
            setSize({ w: Math.max(1, r.width), h: Math.max(1, r.height) })
            setEdgeX(-r.left)
            let scope: HTMLElement | null = el.parentElement
            for (let i = 0; i < 4 && scope && !(scope.textContent || "").includes(target); i++) scope = scope.parentElement
            if (!scope) return
            // find the heading block whose text starts with the target, then use its very last character
            // (a heading can be split into several text nodes, e.g. one per line)
            const blocks = Array.from(scope.querySelectorAll("h1,h2,h3,h4,h5,h6,p")) as HTMLElement[]
            const head = blocks.find((b) => (b.textContent || "").trim().startsWith(target))
            if (!head) return
            const walker = document.createTreeWalker(head, NodeFilter.SHOW_TEXT)
            let lastNode: Node | null = null
            let node: Node | null
            while ((node = walker.nextNode())) if ((node.textContent || "").trim()) lastNode = node
            if (!lastNode) return
            const txt = lastNode.textContent || ""
            let last = txt.length - 1
            while (last > 0 && /\s/.test(txt[last])) last--
            headRef.current = lastNode.parentElement
            const range = document.createRange()
            range.setStart(lastNode, last)
            range.setEnd(lastNode, last + 1)
            const kr = range.getBoundingClientRect()
            if (kr.width > 0) {
                // land just past the last letter, around the middle of its height
                setKx(kr.left + kr.width * 0.74 + Math.max(40, kr.width * 1.3) - r.left)
                setKy(kr.top + kr.height * 0.45 - r.top)
            }
        }
        const ro = new ResizeObserver(measure)
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure)
        const tm = setTimeout(measure, 600)
        ro.observe(el)
        let raf = 0
        let goal = 0
        let shown = 0
        // the line eases toward where the scroll says it should be, so it never jumps ahead
        const tick = () => {
            raf = 0
            const diff = goal - shown
            shown = Math.abs(diff) < 0.002 ? goal : shown + diff * 0.06
            const nt = Math.round(shown * 400) / 400
            // when the dot reaches the heading it turns accent (the heading itself stays black)
            if (!arrivedRef.current && shown > 0.985) { arrivedRef.current = true; setArrived(true) }
            else if (arrivedRef.current && shown < 0.9) { arrivedRef.current = false; setArrived(false) }
            setT((old) => (old === nt ? old : nt))
            if (shown !== goal) raf = requestAnimationFrame(tick)
        }
        const update = () => {
            const r = el.getBoundingClientRect()
            const vh = window.innerHeight
            const y = window.scrollY
            // spread the drawing over more scrolling: done when the route's end reaches ~60% of the screen
            const endY = r.top + y + r.height - vh * 0.6
            const startY = fromTop ? 0 : Math.max(0, r.top + y - vh * 0.85)
            const p = endY > startY ? (y - startY) / (endY - startY) : 1
            goal = Math.max(0, Math.min(1, p))
            if (!raf) raf = requestAnimationFrame(tick)
        }
        const onScroll = () => update()
        update()
        window.addEventListener("scroll", onScroll, { passive: true })
        window.addEventListener("resize", onScroll)
        return () => { clearTimeout(tm); ro.disconnect(); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf) }
    }, [target, fromTop])

    const { w: W, h: H } = size
    const x0 = fromEdge ? edgeX : startX, y0 = 2
    const xe = kx ?? endInset, ye = ky ?? H + 10
    const p1 = [W * 0.55, H * 0.36]
    const c1a = [fromEdge ? x0 + (startX - x0) * 0.6 + W * 0.04 : x0 + W * 0.04, H * 0.32], c1b = [W * 0.34, H * 0.12]
    // last leg: a wide half-circle that swings out to the right and comes back into the k horizontally
    const c2a = [2 * p1[0] - c1b[0], 2 * p1[1] - c1b[1]]
    const c2b = [xe + Math.max(60, Math.min(Math.max(W * 0.3, 220), W - xe - 16)), ye]
    const bz = (a: number, b: number, c: number, e: number, t: number) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * e
    const p2 = [bz(p1[0], c2a[0], c2b[0], xe, 0.55), bz(p1[1], c2a[1], c2b[1], ye, 0.55)]
    const d = `M ${x0} ${y0} C ${c1a[0]} ${c1a[1]}, ${c1b[0]} ${c1b[1]}, ${p1[0]} ${p1[1]} C ${c2a[0]} ${c2a[1]}, ${c2b[0]} ${c2b[1]}, ${xe} ${ye}`

    React.useEffect(() => {
        if (pathRef.current) setLen(pathRef.current.getTotalLength())
    }, [d])

    const show = (k: number): React.CSSProperties => ({ opacity: t >= k ? 1 : 0, transform: t >= k ? "scale(1)" : "scale(0.4)", transformBox: "fill-box" as const, transformOrigin: "center", transition: "opacity .35s ease, transform .45s cubic-bezier(.3,1.6,.5,1)" })

    return (
        <div ref={ref} style={{ width: "100%", height: "100%", position: "relative", pointerEvents: "none" }}>
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, overflow: "visible" }} aria-hidden="true">
                <defs>
                    <mask id={maskId} maskUnits="userSpaceOnUse" x={Math.min(-200, x0 - 60)} y={-200} width={W + 400 - Math.min(0, x0 - 60 + 200)} height={Math.max(H, (ky ?? H) + 200) + 400}>
                        <path ref={pathRef} d={d} fill="none" stroke="#fff" strokeWidth={10} strokeDasharray={len} strokeDashoffset={len * (1 - t)} />
                    </mask>
                </defs>
                <path d={d} fill="none" stroke={color} strokeWidth={1.4} strokeDasharray="5 7" strokeLinecap="round" mask={`url(#${maskId})`} />
                <circle cx={p1[0]} cy={p1[1]} r={5} fill="#fff" stroke={color} strokeWidth={1.4} style={show(0.42)} />
                <circle cx={p2[0]} cy={p2[1]} r={5} fill="#fff" stroke={color} strokeWidth={1.4} style={show(0.74)} />
                {arrived && <circle cx={xe} cy={ye} r={4.5} fill="none" stroke={accent} strokeWidth={1.2} style={{ transformBox: "fill-box", transformOrigin: "center", animation: "srPing 0.9s ease-out 1" }} />}
                <circle cx={xe} cy={ye} r={4.5} fill={arrived ? accent : color} style={{ ...show(0.99), transition: show(0.99).transition + ", fill .4s ease" }} />
                <style>{"@keyframes srPing{from{transform:scale(1);opacity:.9}to{transform:scale(3.2);opacity:0}}"}</style>
            </svg>
        </div>
    )
}

ScrollRoute.defaultProps = { color: "#1a1814", endInset: 44, startX: 30, target: "Selected", accent: "#C2456E", fromTop: true, fromEdge: false }

addPropertyControls(ScrollRoute, {
    color: { type: ControlType.Color, title: "Color" },
    target: { type: ControlType.String, title: "End at" },
    accent: { type: ControlType.Color, title: "Arrive color" },
    fromTop: { type: ControlType.Boolean, title: "Start at top" },
    fromEdge: { type: ControlType.Boolean, title: "From page edge" },
    startX: { type: ControlType.Number, title: "Start X", min: 0, max: 200 },
    endInset: { type: ControlType.Number, title: "End X", min: 0, max: 200 },
})
