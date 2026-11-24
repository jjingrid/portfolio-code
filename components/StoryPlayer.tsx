import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * Instagram story on an iPhone screen. Plays in a loop; tap left/right to step.
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function StoryPlayer(props) {
    const { images, seconds, handle, avatar, avatarZoom, avatarX, avatarY, ago } = props
    const av = typeof avatar === "string" ? avatar : avatar && avatar.src
    const list = (images || []).map((i) => (typeof i === "string" ? i : i && i.src)).filter(Boolean)
    const n = Math.max(1, list.length)
    const [i, setI] = React.useState(0)
    const [k, setK] = React.useState(0)
    const [loop, setLoop] = React.useState(0)
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const [pop, setPop] = React.useState(0)
    // feed mode: the phone starts on the Instagram home feed; tapping the profile picture opens the story
    const [open, setOpen] = React.useState(!props.startOnFeed)
    const [seen, setSeen] = React.useState(false)
    const [origin, setOrigin] = React.useState("12% 4%")
    const openStory = (o) => { setOrigin(o || "12% 4%"); setI(0); setK(0); setLoop((v) => v + 1); setPop((v) => v + 1); setOpen(true) }
    const closeStory = () => { setOpen(false); setSeen(true); setI(0); setK(0) }
    // opened from the profile page (IgProfile): restart from the first frame with an open animation
    React.useEffect(() => {
        const on = () => { setOrigin("16% 9%"); setI(0); setK(0); setLoop((v) => v + 1); setPop((v) => v + 1); setOpen(true) }
        window.addEventListener("cg-story-open", on)
        return () => window.removeEventListener("cg-story-open", on)
    }, [])
    React.useEffect(() => {
        if (isCanvas || !open) return
        const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
        const t0 = performance.now()
        let raf = 0
        const tick = (t) => {
            const f = (t - t0) / (seconds * 1000)
            if (reduce) { setK(1); return }
            if (f >= 1) { if (props.startOnFeed && i === n - 1) { closeStory(); return } setK(0); setI((v) => (v + 1) % n); setLoop((v) => v + 1); return }
            setK(f)
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [i, n, seconds, isCanvas, loop, open])
    const go = (d) => { setK(0); setLoop((v) => v + 1); setI((v) => (v + d + n) % n) }
    const sys = "-apple-system, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif"
    const postImg = typeof props.post === "string" ? props.post : props.post && props.post.src
    const avBg = av ? "#fff url(" + av + ") " + avatarX + "% " + avatarY + "% / " + avatarZoom + "% no-repeat" : "#E9A55B"
    const ringBg = seen ? "#c7c7cc" : "conic-gradient(from 210deg, #F2A65A, #BC4BBC, #1C6A96, #F2A65A)"
    const ic = { fill: "none", stroke: "#000", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as any
    const others = String(props.friends || "").split(",").map((s) => s.trim()).filter(Boolean)
    const feed = (
        <div style={{ position: "absolute", inset: 0, color: "#000", background: "#fff" }}>
            <style>{"@keyframes spRing{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}"}</style>
            {/* status bar */}
            <div style={{ position: "absolute", left: "34%", right: "34%", top: "1.5%", height: "3.7%", background: "#000", borderRadius: 999, zIndex: 3 }} />
            <div style={{ position: "absolute", left: "9%", right: "7%", top: "2.1%", height: "2.6%", display: "flex", alignItems: "center", justifyContent: "space-between", fontWeight: 600, zIndex: 3 }}>
                <span style={{ fontSize: "4.2cqw" }}>9:41</span>
                <svg width="20%" viewBox="0 0 56 11" fill="#000" aria-hidden="true"><rect x="0" y="7" width="3" height="4" rx="1" /><rect x="4.5" y="5" width="3" height="6" rx="1" /><rect x="9" y="2.5" width="3" height="8.5" rx="1" /><rect x="13.5" y="0" width="3" height="11" rx="1" /><rect x="37.5" y="1" width="16" height="9" rx="2.6" fill="none" stroke="#000" strokeOpacity=".4" /><rect x="39" y="2.5" width="12" height="6" rx="1.4" /></svg>
            </div>
            <div style={{ position: "absolute", left: 0, right: 0, top: "6.4%", bottom: 0, overflow: "hidden" }}>
                {/* top bar: + / wordmark / heart */}
                <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2cqw 4.5cqw 3cqw" }}>
                    <svg viewBox="0 0 24 24" style={{ width: "6.4cqw", height: "6.4cqw" }} {...ic}><path d="M12 4v16M4 12h16" /></svg>
                    <span style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", fontFamily: "'Grand Hotel', 'Snell Roundhand', 'Brush Script MT', cursive", fontSize: "8cqw", lineHeight: 1 }}>Instagram</span>
                    <svg viewBox="0 0 24 24" style={{ width: "6.4cqw", height: "6.4cqw" }} {...ic}><path d="M12 20s-8.5-5.1-8.5-11A4.8 4.8 0 0 1 12 6.3 4.8 4.8 0 0 1 20.5 9c0 5.9-8.5 11-8.5 11Z" /></svg>
                </div>
                {/* stories row */}
                <div style={{ display: "flex", gap: "3.2cqw", padding: "0 3.2cqw 3cqw", overflow: "hidden" }}>
                    <div style={{ flex: "none", width: "19cqw", textAlign: "center" }}>
                        <span style={{ position: "relative", display: "block", width: "19cqw", height: "19cqw", borderRadius: "50%", background: "#e9e6e1" }}>
                            <span style={{ position: "absolute", right: "-0.5cqw", bottom: "-0.5cqw", width: "6cqw", height: "6cqw", borderRadius: "50%", background: "#000", border: "0.8cqw solid #fff", display: "grid", placeItems: "center", color: "#fff", fontSize: "4.4cqw", lineHeight: 1, fontWeight: 600 }}>+</span>
                        </span>
                        <span style={{ display: "block", marginTop: "1.2cqw", fontSize: "3cqw", color: "#262626" }}>Your story</span>
                    </div>
                    <button aria-label={"View " + handle + "'s story"} onClick={() => openStory("40% 9%")} style={{ flex: "none", width: "19cqw", padding: 0, border: 0, background: "none", cursor: "pointer", textAlign: "center", fontFamily: sys }}>
                        <span style={{ display: "block", width: "19cqw", height: "19cqw", borderRadius: "50%", padding: "0.8cqw", boxSizing: "border-box", background: seen ? "#c7c7cc" : "conic-gradient(from 200deg, #FEDA75, #FA7E1E, #D62976, #962FBF, #4F5BD5, #FEDA75)", animation: seen ? "none" : "spRing 1.8s ease-in-out infinite" }}>
                            <span style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", padding: "0.8cqw", boxSizing: "border-box", background: "#fff" }}>
                                <span style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", background: avBg, boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,.12)" }} />
                            </span>
                        </span>
                        <span style={{ display: "block", marginTop: "1.2cqw", fontSize: "3cqw", color: "#262626", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{handle}</span>
                    </button>
                    {others.map((nm, j) => (
                        <div key={j} style={{ flex: "none", width: "19cqw", textAlign: "center" }}>
                            <span style={{ display: "block", width: "19cqw", height: "19cqw", borderRadius: "50%", padding: "0.8cqw", boxSizing: "border-box", background: "conic-gradient(from 200deg, #FEDA75, #FA7E1E, #D62976, #962FBF, #4F5BD5, #FEDA75)" }}>
                                <span style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", border: "0.8cqw solid #fff", boxSizing: "border-box", background: ["#e8dccd", "#d6dfe6", "#e4d6e3", "#dfe2d3"][j % 4] }} />
                            </span>
                            <span style={{ display: "block", marginTop: "1.2cqw", fontSize: "3cqw", color: "#262626", whiteSpace: "nowrap" }}>{nm}</span>
                        </div>
                    ))}
                </div>
                {/* post */}
                <div style={{ display: "flex", alignItems: "center", gap: "2.6cqw", padding: "2.4cqw 3.4cqw" }}>
                    <button aria-label={"View " + handle + "'s story"} onClick={() => openStory("10% 30%")} style={{ flex: "none", width: "10.5cqw", height: "10.5cqw", borderRadius: "50%", padding: "0.6cqw", border: 0, background: seen ? "#c7c7cc" : "conic-gradient(from 200deg, #FEDA75, #FA7E1E, #D62976, #962FBF, #4F5BD5, #FEDA75)", cursor: "pointer", boxSizing: "border-box" }}>
                        <span style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", border: "0.6cqw solid #fff", boxSizing: "border-box", background: avBg }} />
                    </button>
                    <span style={{ lineHeight: 1.2 }}>
                        <b style={{ display: "block", fontSize: "3.8cqw", fontWeight: 600 }}>{handle}</b>
                        <span style={{ display: "block", fontSize: "3.3cqw", color: "#262626" }}>{props.postSub}</span>
                    </span>
                    <svg viewBox="0 0 24 24" style={{ marginLeft: "auto", width: "5.6cqw", height: "5.6cqw" }} {...ic}><path d="M4 9h16M8 15h12" /></svg>
                </div>
                <div style={{ width: "100%", aspectRatio: "4 / 5", background: postImg ? "#eee url(" + postImg + ") " + (props.postCrop || "center / cover") + " no-repeat" : "#eee" }} />
                <div style={{ display: "flex", gap: "3.8cqw", padding: "2.6cqw 3.4cqw 1.4cqw" }}>
                    <svg viewBox="0 0 24 24" style={{ width: "6.4cqw", height: "6.4cqw" }} {...ic}><path d="M12 20s-8.5-5.1-8.5-11A4.8 4.8 0 0 1 12 6.3 4.8 4.8 0 0 1 20.5 9c0 5.9-8.5 11-8.5 11Z" /></svg>
                    <svg viewBox="0 0 24 24" style={{ width: "6.4cqw", height: "6.4cqw" }} {...ic}><path d="M20.5 12a8.5 8.5 0 1 1-3.3-6.7A8.5 8.5 0 0 1 20.5 12Z" /><path d="M20.5 20.5 19 16" /></svg>
                    <svg viewBox="0 0 24 24" style={{ width: "6.4cqw", height: "6.4cqw" }} {...ic}><path d="M21 3 3 10l7 3 3 7 8-17Z" /><path d="M10 13 21 3" /></svg>
                    <svg viewBox="0 0 24 24" style={{ marginLeft: "auto", width: "6.4cqw", height: "6.4cqw" }} {...ic}><path d="M6 3h12v18l-6-5-6 5Z" /></svg>
                </div>
                <div style={{ padding: "0 3.4cqw", fontSize: "3.5cqw", lineHeight: 1.35 }}>
                    <div style={{ fontWeight: 600 }}>{props.likes}</div>
                    <div><b style={{ fontWeight: 600 }}>{handle}</b> {props.caption}</div>
                </div>
            </div>
            {/* bottom nav: floating pill */}
            <div style={{ position: "absolute", left: "4cqw", right: "4cqw", bottom: "5.5cqw", height: "15cqw", background: "rgba(255,255,255,.96)", borderRadius: 999, boxShadow: "0 2px 14px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,.05)", display: "flex", justifyContent: "space-around", alignItems: "center", padding: "0 2cqw" }}>
                <span style={{ width: "19cqw", height: "11cqw", borderRadius: 999, background: "#efefef", display: "grid", placeItems: "center" }}>
                    <svg viewBox="0 0 24 24" style={{ width: "6.4cqw", height: "6.4cqw" }} fill="#000" stroke="#000" strokeWidth={1.8} strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" /></svg>
                </span>
                <svg viewBox="0 0 24 24" style={{ width: "6.4cqw", height: "6.4cqw" }} {...ic}><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><path d="M10 9v6l5-3z" /></svg>
                <svg viewBox="0 0 24 24" style={{ width: "6.4cqw", height: "6.4cqw" }} {...ic}><path d="M21 3 3 10l7 3 3 7 8-17Z" /><path d="M10 13 21 3" /></svg>
                <svg viewBox="0 0 24 24" style={{ width: "6.4cqw", height: "6.4cqw" }} {...ic}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
                <span style={{ width: "7cqw", height: "7cqw", borderRadius: "50%", background: "#d9d6d0", boxShadow: "0 0 0 1px rgba(0,0,0,.1)" }} />
            </div>
            <div style={{ position: "absolute", left: "35%", right: "35%", bottom: "1.6cqw", height: 4, borderRadius: 4, background: "#000" }} />
        </div>
    )
    const side = (top, h, left) => ({ position: "absolute", top, height: h, width: "1.2%", [left ? "left" : "right"]: "-0.9%", background: "#2a2a2c", borderRadius: 2 } as React.CSSProperties)
    return (
        <div style={{ position: "relative", width: "100%", aspectRatio: "71.5 / 147.5" }}>
            <div style={side("17%", "4%", true)} />
            <div style={side("24%", "8%", true)} />
            <div style={side("34%", "8%", true)} />
            <div style={side("27%", "12%", false)} />
            <div style={{ position: "absolute", inset: 0, background: "#1c1c1e", borderRadius: "17% / 8.2%", padding: "3.2%", boxSizing: "border-box", boxShadow: "inset 0 0 0 1.5px #3a3a3c" }}>
                <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: "14% / 6.6%", background: open ? "#0d0d0f" : "#fff", fontFamily: sys, containerType: "inline-size" } as any}>
                    {!open ? feed : (<>
                    <style>{"@keyframes spOpen{from{transform:scale(.18);opacity:0;border-radius:50%}60%{opacity:1}to{transform:scale(1);opacity:1;border-radius:10px}}"}</style>
                    <div key={"pop" + pop} style={{ position: "absolute", left: 0, right: 0, top: "6.2%", aspectRatio: "9 / 16", borderRadius: 10, overflow: "hidden", background: "#1F2A4A", transformOrigin: origin, animation: pop ? "spOpen .55s cubic-bezier(.2,.8,.2,1)" : "none" }}>
                        {list.map((s, j) => (
                            <img key={j} src={s} alt={j === i ? props.alt : ""} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: j === i ? 1 : 0, transition: "opacity .35s ease" }} />
                        ))}
                        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "16%", background: "linear-gradient(rgba(0,0,0,.35), transparent)", pointerEvents: "none" }} />
                    </div>
                    {/* iOS status bar + Dynamic Island */}
                    <div style={{ position: "absolute", left: "34%", right: "34%", top: "1.5%", height: "3.7%", background: "#000", borderRadius: 999 }} />
                    <div style={{ position: "absolute", left: "9%", right: "7%", top: "2.1%", height: "2.6%", display: "flex", alignItems: "center", justifyContent: "space-between", color: "#fff", fontWeight: 600, fontSize: "clamp(9px, 3.6cqw, 14px)" }}>
                        <span style={{ fontSize: 12, letterSpacing: "-.01em" }}>9:41</span>
                        <svg width="56" height="11" viewBox="0 0 56 11" fill="#fff" aria-hidden="true">
                            <rect x="0" y="7" width="3" height="4" rx="1" /><rect x="4.5" y="5" width="3" height="6" rx="1" /><rect x="9" y="2.5" width="3" height="8.5" rx="1" /><rect x="13.5" y="0" width="3" height="11" rx="1" />
                            <path d="M27 2.2a9.6 9.6 0 0 1 6.6 2.6l-1.2 1.3a7.8 7.8 0 0 0-10.8 0l-1.2-1.3A9.6 9.6 0 0 1 27 2.2Zm0 3.4a6 6 0 0 1 4.1 1.6l-1.2 1.3a4.2 4.2 0 0 0-5.8 0l-1.2-1.3A6 6 0 0 1 27 5.6Zm0 3.3c.6 0 1.2.2 1.6.6L27 11l-1.6-1.5c.4-.4 1-.6 1.6-.6Z" />
                            <rect x="37.5" y="1" width="16" height="9" rx="2.6" fill="none" stroke="#fff" strokeOpacity=".5" />
                            <rect x="39" y="2.5" width="12" height="6" rx="1.4" /><rect x="54.3" y="3.8" width="1.4" height="3.4" rx=".7" fillOpacity=".5" />
                        </svg>
                    </div>
                    {/* story progress */}
                    <div style={{ position: "absolute", left: "3.5%", right: "3.5%", top: "7.1%", display: "flex", gap: 3 }}>
                        {Array.from({ length: n }).map((_, j) => (
                            <span key={j} style={{ flex: 1, height: 2.2, borderRadius: 2, background: "rgba(255,255,255,.35)", overflow: "hidden" }}>
                                <i style={{ display: "block", height: "100%", background: "#fff", width: (j < i ? 100 : j === i ? Math.min(100, k * 100) : 0) + "%" }} />
                            </span>
                        ))}
                    </div>
                    {/* story header */}
                    <div style={{ position: "absolute", left: "3.5%", right: "3.5%", top: "8.7%", display: "flex", alignItems: "center", gap: 7, color: "#fff", fontSize: 11.5 }}>
                        <span style={{ width: 26, height: 26, borderRadius: "50%", flex: "none", boxShadow: "0 0 0 1px rgba(255,255,255,.6)", background: av ? "#fff url(" + av + ") " + avatarX + "% " + avatarY + "% / " + avatarZoom + "% no-repeat" : "#E9A55B" }} />
                        <b style={{ fontWeight: 600 }}>{handle}</b>
                        <span style={{ opacity: 0.7 }}>{ago}</span>
                        <span style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
                            <svg width="16" height="4" viewBox="0 0 16 4" fill="#fff" aria-hidden="true"><circle cx="2" cy="2" r="1.6" /><circle cx="8" cy="2" r="1.6" /><circle cx="14" cy="2" r="1.6" /></svg>
                            <svg onClick={props.startOnFeed ? closeStory : undefined} role={props.startOnFeed ? "button" : undefined} aria-label={props.startOnFeed ? "Close story" : undefined} style={{ cursor: props.startOnFeed ? "pointer" : "default", position: "relative", zIndex: 4 }} width="13" height="13" viewBox="0 0 13 13" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"><path d="M1.5 1.5l10 10M11.5 1.5l-10 10" /></svg>
                        </span>
                    </div>
                    {/* reply bar */}
                    <div style={{ position: "absolute", left: "3.5%", right: "3.5%", bottom: "3.6%", display: "flex", alignItems: "center", gap: 12, color: "#fff" }}>
                        <span style={{ flex: 1, height: 34, border: "1px solid rgba(255,255,255,.55)", borderRadius: 999, display: "flex", alignItems: "center", padding: "0 14px", fontSize: 12.5, opacity: 0.95 }}>Send message</span>
                        <svg width="20" height="18" viewBox="0 0 24 22" fill="none" stroke="#fff" strokeWidth="1.8" aria-hidden="true"><path d="M12 20s-8.5-5.1-8.5-11A4.8 4.8 0 0 1 12 6.3 4.8 4.8 0 0 1 20.5 9c0 5.9-8.5 11-8.5 11Z" strokeLinejoin="round" /></svg>
                        <svg width="20" height="18" viewBox="0 0 24 22" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M22 2 2 9.5l8 3 3 8L22 2Z" /><path d="M10 12.5 22 2" /></svg>
                    </div>
                    <div style={{ position: "absolute", left: "35%", right: "35%", bottom: "1.2%", height: 4, borderRadius: 4, background: "rgba(255,255,255,.85)" }} />
                    <button aria-label="Previous" onClick={() => go(-1)} style={{ position: "absolute", left: 0, top: "12%", bottom: "14%", width: "35%", background: "none", border: 0, cursor: "pointer" }} />
                    <button aria-label="Next" onClick={() => go(1)} style={{ position: "absolute", right: 0, top: "12%", bottom: "14%", width: "35%", background: "none", border: 0, cursor: "pointer" }} />
                    </>)}
                </div>
            </div>
        </div>
    )
}

StoryPlayer.defaultProps = { startOnFeed: false, postSub: "Common Ground Café", friends: "alex, sam, jordan", likes: "1,248 likes", caption: "Something is brewing between U of T and TMU ☕ Opening October 17. Tap our story for the launch offer.",  avatarZoom: 100, avatarX: 50, avatarY: 50, seconds: 5, handle: "commonground", ago: "2h", alt: "Common Ground Instagram story" }

addPropertyControls(StoryPlayer, {
    images: { type: ControlType.Array, title: "Frames", control: { type: ControlType.Image } },
    seconds: { type: ControlType.Number, title: "Per frame", min: 1, max: 15, step: 0.5, unit: "s" },
    handle: { type: ControlType.String, title: "Handle" },
    ago: { type: ControlType.String, title: "Time" },
    avatar: { type: ControlType.Image, title: "Avatar" },
    avatarZoom: { type: ControlType.Number, title: "Avatar zoom", min: 100, max: 2000, unit: "%" },
    avatarX: { type: ControlType.Number, title: "Avatar X", min: 0, max: 100, unit: "%" },
    avatarY: { type: ControlType.Number, title: "Avatar Y", min: 0, max: 100, unit: "%" },
    startOnFeed: { type: ControlType.Boolean, title: "Start on feed" },
    post: { type: ControlType.Image, title: "Feed post", hidden: (p) => !p.startOnFeed },
    postCrop: { type: ControlType.String, title: "Post crop", hidden: (p) => !p.startOnFeed },
    friends: { type: ControlType.String, title: "Other stories", hidden: (p) => !p.startOnFeed },
    postSub: { type: ControlType.String, title: "Post subtitle", hidden: (p) => !p.startOnFeed },
    likes: { type: ControlType.String, title: "Likes", hidden: (p) => !p.startOnFeed },
    caption: { type: ControlType.String, title: "Caption", displayTextArea: true, hidden: (p) => !p.startOnFeed },
    alt: { type: ControlType.String, title: "Alt" },
})
