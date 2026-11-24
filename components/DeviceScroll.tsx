import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

/**
 * Laptop (+ optional phone) showing a long page screenshot. Visitors scroll inside the screen themselves.
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function DeviceScroll(props) {
    const { desktop, mobile, hint } = props
    const lap = React.useRef(null)
    const ph = React.useRef(null)
    const bar = React.useRef(null)
    const [touched, setTouched] = React.useState(false)
    const src = (img) => (typeof img === "string" ? img : img && img.src)
    const showPhone = !!src(mobile)

    const sync = () => {
        const a = lap.current
        if (!a) return
        const max = a.scrollHeight - a.clientHeight
        const p = max > 0 ? a.scrollTop / max : 0
        if (ph.current) { const m = ph.current.scrollHeight - ph.current.clientHeight; ph.current.scrollTop = p * m }
        if (bar.current) bar.current.style.transform = "translateY(" + p * (a.clientHeight - 48 - 12) + "px)"
        if (!touched && a.scrollTop > 4) setTouched(true)
    }
    const fromPhone = () => {
        const b = ph.current, a = lap.current
        if (!a || !b || document.activeElement === a) return
        const m = b.scrollHeight - b.clientHeight
        const p = m > 0 ? b.scrollTop / m : 0
        a.scrollTop = p * (a.scrollHeight - a.clientHeight)
    }
    // mouse drag to scroll as well as wheel / trackpad / touch
    const dragScroll = (el) => (e) => {
        if (e.pointerType !== "mouse" || !el) return
        const y0 = e.clientY, t0 = el.scrollTop
        const mv = (ev) => { el.scrollTop = t0 - (ev.clientY - y0) }
        const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up) }
        window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up)
    }
    const scroller: React.CSSProperties = { position: "absolute", inset: 0, overflowY: "auto", overscrollBehavior: "auto", scrollbarWidth: "none", cursor: "grab" }
    return (
        <div style={{ width: "100%" }}>
            <style>{".ds-s::-webkit-scrollbar{display:none}@keyframes dsNudge{0%,100%{transform:translateY(0)}50%{transform:translateY(5px)}}"}</style>
            <div style={{ width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "4%" }}>
                <div style={{ width: showPhone ? "74%" : "100%", flex: "none" }}>
                    <div style={{ background: "#1c1c1e", padding: "2.2% 2.2% 2.6%", borderRadius: "14px 14px 0 0" }}>
                        <div style={{ position: "relative", aspectRatio: "16 / 10", overflow: "hidden", background: "#fff" }}>
                            <div ref={lap} className="ds-s" tabIndex={0} aria-label={props.alt + ". Scroll to explore."} onScroll={sync} onPointerDown={(e) => dragScroll(lap.current)(e)} style={scroller}>
                                {src(desktop) && <img src={src(desktop)} alt={props.alt} draggable={false} style={{ display: "block", width: "100%", height: "auto", userSelect: "none" }} />}
                            </div>
                            <div aria-hidden="true" style={{ position: "absolute", right: 4, top: 6, bottom: 6, width: 3, borderRadius: 3, background: "rgba(0,0,0,.08)", pointerEvents: "none" }}>
                                <div ref={bar} style={{ height: 48, borderRadius: 3, background: "rgba(0,0,0,.35)" }} />
                            </div>
                        </div>
                    </div>
                    <div style={{ height: 14, background: "#d5d3cf", borderRadius: "0 0 10px 10px", margin: "0 -5%", position: "relative" }}>
                        <div style={{ position: "absolute", left: "42%", right: "42%", top: 0, height: 5, background: "#bdbab5", borderRadius: "0 0 6px 6px" }} />
                    </div>
                </div>
                {showPhone && (
                    <div style={{ width: "21%", flex: "none", aspectRatio: "9 / 19.5", background: "#1c1c1e", borderRadius: "16% / 7.4%", padding: "3.5%", boxSizing: "border-box" }}>
                        <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: "12% / 5.6%", background: "#fff" }}>
                            <div ref={ph} className="ds-s" onScroll={fromPhone} style={scroller}>
                                <img src={src(mobile)} alt="" draggable={false} style={{ display: "block", width: "100%", height: "auto" }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div style={{ marginTop: 18, display: "flex", justifyContent: "center", alignItems: "center", gap: 8, font: "500 12px/1.4 'DM Sans', system-ui, sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "#6f6c66" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C2456E", animation: touched ? "none" : "dsNudge 1.4s ease-in-out infinite" }} />
                {hint}
            </div>
        </div>
    )
}

DeviceScroll.defaultProps = { hint: "Scroll inside the screen to explore the site", alt: "Common Ground website homepage" }

addPropertyControls(DeviceScroll, {
    desktop: { type: ControlType.Image, title: "Desktop" },
    mobile: { type: ControlType.Image, title: "Phone" },
    hint: { type: ControlType.String, title: "Hint" },
    alt: { type: ControlType.String, title: "Alt" },
})
