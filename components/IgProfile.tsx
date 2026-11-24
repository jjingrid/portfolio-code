import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

/**
 * Instagram profile page on an iPhone. Tapping the profile picture opens the story
 * (fires a "cg-story-open" event that StoryPlayer listens for).
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function IgProfile(props) {
    const { posts, handle, name, category, bio, link, postsCount, followers, following, avatar, avatarZoom, avatarX, avatarY, ring1, ring2, ring3 } = props
    const av = typeof avatar === "string" ? avatar : avatar && avatar.src
    const list = (posts || []).map((i) => (typeof i === "string" ? i : i && i.src)).filter(Boolean)
    const hl = (props.highlights || []).map((i) => (typeof i === "string" ? i : i && i.src)).filter(Boolean)
    const hlNames = String(props.highlightNames || "").split(",").map((s) => s.trim())
    // per-post crop: "position / size" separated by ";" (e.g. "50% 30% / cover; top / cover")
    const crops = String(props.crops || "").split(";").map((s) => s.trim())
    const [seen, setSeen] = React.useState(false)
    const [tapped, setTapped] = React.useState(false)
    const open = () => {
        setSeen(true); setTapped(true)
        try { window.dispatchEvent(new CustomEvent("cg-story-open")) } catch (e) {}
    }
    const sys = "-apple-system, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif"
    const side = (top, h, left) => ({ position: "absolute", top, height: h, width: "1.2%", [left ? "left" : "right"]: "-0.9%", background: "#2a2a2c", borderRadius: 2 } as React.CSSProperties)
    const avBg = av ? "#fff url(" + av + ") " + avatarX + "% " + avatarY + "% / " + avatarZoom + "% no-repeat" : "#E9A55B"
    const ring = seen ? "#c7c7cc" : "conic-gradient(from 210deg, " + ring1 + ", " + ring2 + ", " + ring3 + ", " + ring1 + ")"
    const ico = { width: "6.2cqw", height: "6.2cqw", fill: "none", stroke: "#000", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as any
    const stat = (v, l) => (
        <div style={{ textAlign: "center", lineHeight: 1.15 }}>
            <div style={{ fontWeight: 600, fontSize: "4.3cqw" }}>{v}</div>
            <div style={{ fontSize: "3.6cqw" }}>{l}</div>
        </div>
    )
    return (
        <div style={{ width: "100%" }}>
            <div style={{ position: "relative", width: "100%", aspectRatio: "71.5 / 147.5" }}>
                <div style={side("17%", "4%", true)} />
                <div style={side("24%", "8%", true)} />
                <div style={side("34%", "8%", true)} />
                <div style={side("27%", "12%", false)} />
                <div style={{ position: "absolute", inset: 0, background: "#1c1c1e", borderRadius: "17% / 8.2%", padding: "3.2%", boxSizing: "border-box", boxShadow: "inset 0 0 0 1.5px #3a3a3c" }}>
                    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: "14% / 6.6%", background: "#fff", fontFamily: sys, color: "#000", containerType: "inline-size" } as any}>
                        {/* status bar */}
                        <div style={{ position: "absolute", left: "34%", right: "34%", top: "1.5%", height: "3.7%", background: "#000", borderRadius: 999, zIndex: 3 }} />
                        <div style={{ position: "absolute", left: "9%", right: "7%", top: "2.1%", height: "2.6%", display: "flex", alignItems: "center", justifyContent: "space-between", fontWeight: 600, zIndex: 3 }}>
                            <span style={{ fontSize: "4.2cqw", letterSpacing: "-.01em" }}>9:41</span>
                            <svg width="20%" viewBox="0 0 56 11" fill="#000" aria-hidden="true">
                                <rect x="0" y="7" width="3" height="4" rx="1" /><rect x="4.5" y="5" width="3" height="6" rx="1" /><rect x="9" y="2.5" width="3" height="8.5" rx="1" /><rect x="13.5" y="0" width="3" height="11" rx="1" />
                                <path d="M27 2.2a9.6 9.6 0 0 1 6.6 2.6l-1.2 1.3a7.8 7.8 0 0 0-10.8 0l-1.2-1.3A9.6 9.6 0 0 1 27 2.2Zm0 3.4a6 6 0 0 1 4.1 1.6l-1.2 1.3a4.2 4.2 0 0 0-5.8 0l-1.2-1.3A6 6 0 0 1 27 5.6Zm0 3.3c.6 0 1.2.2 1.6.6L27 11l-1.6-1.5c.4-.4 1-.6 1.6-.6Z" />
                                <rect x="37.5" y="1" width="16" height="9" rx="2.6" fill="none" stroke="#000" strokeOpacity=".4" />
                                <rect x="39" y="2.5" width="12" height="6" rx="1.4" /><rect x="54.3" y="3.8" width="1.4" height="3.4" rx=".7" fillOpacity=".4" />
                            </svg>
                        </div>
                        {/* scrollable profile */}
                        <div className="igp-scroll" style={{ position: "absolute", left: 0, right: 0, top: "6.4%", bottom: "8.6%", overflowY: "auto", scrollbarWidth: "none" } as any}>
                            <style>{".igp-scroll::-webkit-scrollbar{display:none}@keyframes igpPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.8);opacity:.35}}@keyframes igpRing{0%,100%{transform:scale(1)}50%{transform:scale(1.045)}}"}</style>
                            {/* top bar */}
                            <div style={{ display: "flex", alignItems: "center", padding: "2cqw 4.5cqw 3cqw", gap: "1.5cqw" }}>
                                <svg {...ico} viewBox="0 0 24 24" style={{ width: "4.2cqw", height: "4.2cqw" }}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                                <b style={{ fontSize: "5.2cqw", fontWeight: 700, letterSpacing: "-.01em" }}>{handle}</b>
                                <svg {...ico} viewBox="0 0 24 24" style={{ width: "3.6cqw", height: "3.6cqw" }}><path d="m6 9 6 6 6-6" /></svg>
                                <span style={{ marginLeft: "auto", display: "flex", gap: "5cqw" }}>
                                    <svg {...ico} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" /><path d="M12 8v8M8 12h8" /></svg>
                                    <svg {...ico} viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                                </span>
                            </div>
                            {/* avatar + stats */}
                            <div style={{ display: "flex", alignItems: "center", padding: "0 4.5cqw", gap: "5cqw" }}>
                                <button aria-label={"View " + handle + "'s story"} onClick={open} style={{ flex: "none", width: "23cqw", height: "23cqw", borderRadius: "50%", padding: "0.9cqw", border: 0, background: ring, cursor: "pointer", animation: tapped ? "none" : "igpRing 1.8s ease-in-out infinite" }}>
                                    <span style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", padding: "0.9cqw", background: "#fff", boxSizing: "border-box" }}>
                                        <span style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", background: avBg, boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,.12)" }} />
                                    </span>
                                </button>
                                <div style={{ flex: 1, display: "flex", justifyContent: "space-around" }}>
                                    {stat(postsCount, "posts")}{stat(followers, "followers")}{stat(following, "following")}
                                </div>
                            </div>
                            {/* bio */}
                            <div style={{ padding: "2.6cqw 4.5cqw 0", fontSize: "3.75cqw", lineHeight: 1.32 }}>
                                <div style={{ fontWeight: 600 }}>{name}</div>
                                {category && <div style={{ color: "#737373" }}>{category}</div>}
                                {String(bio || "").split("\n").map((l, j) => <div key={j}>{l}</div>)}
                                {link && <div style={{ color: "#00376b", fontWeight: 500 }}>🔗 {link}</div>}
                            </div>
                            {/* buttons */}
                            <div style={{ display: "flex", gap: "1.8cqw", padding: "3.4cqw 4.5cqw 0" }}>
                                {[["Following", "#efefef", "#000"], ["Message", "#efefef", "#000"]].map(([t, bg, c]) => (
                                    <span key={t} style={{ flex: 1, textAlign: "center", background: bg, color: c, borderRadius: "2.2cqw", padding: "2cqw 0", fontSize: "3.7cqw", fontWeight: 600 }}>{t}</span>
                                ))}
                                <span style={{ width: "9cqw", display: "grid", placeItems: "center", background: "#efefef", borderRadius: "2.2cqw" }}>
                                    <svg {...ico} viewBox="0 0 24 24" style={{ width: "4cqw", height: "4cqw" }}><circle cx="9" cy="8" r="3.5" /><path d="M3 20c.8-3.5 3.2-5.5 6-5.5s5.2 2 6 5.5M18 8v6M15 11h6" /></svg>
                                </span>
                            </div>
                            {/* highlights */}
                            {hl.length > 0 && (
                                <div style={{ display: "flex", gap: "4cqw", padding: "4.4cqw 4.5cqw 1cqw", overflow: "hidden" }}>
                                    {hl.map((s, j) => (
                                        <div key={j} style={{ flex: "none", width: "16cqw", textAlign: "center" }}>
                                            <span style={{ display: "block", width: "16cqw", height: "16cqw", borderRadius: "50%", padding: "0.8cqw", boxShadow: "inset 0 0 0 1px #dbdbdb", boxSizing: "border-box" }}>
                                                <span style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", background: "#eee url(" + s + ") center / cover" }} />
                                            </span>
                                            <div style={{ fontSize: "3.1cqw", marginTop: "1.4cqw", whiteSpace: "nowrap" }}>{hlNames[j] || ""}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {/* tabs */}
                            <div style={{ display: "flex", marginTop: "3cqw", borderBottom: "1px solid #efefef" }}>
                                {[0, 1, 2].map((t) => (
                                    <span key={t} style={{ flex: 1, display: "grid", placeItems: "center", padding: "2.6cqw 0", borderBottom: t === 0 ? "1.5px solid #000" : "1.5px solid transparent" }}>
                                        {t === 0 && <svg {...ico} viewBox="0 0 24 24" style={{ width: "5.2cqw", height: "5.2cqw" }}><rect x="3" y="3" width="18" height="18" rx="1" /><path d="M9 3v18M15 3v18M3 9h18M3 15h18" /></svg>}
                                        {t === 1 && <svg {...ico} viewBox="0 0 24 24" stroke="#8e8e8e" style={{ width: "5.2cqw", height: "5.2cqw" }}><rect x="3" y="3" width="18" height="18" rx="5" /><path d="M3 8h18M9 3l3 5M15 3l3 5M10 11.5v5l4.5-2.5z" /></svg>}
                                        {t === 2 && <svg {...ico} viewBox="0 0 24 24" stroke="#8e8e8e" style={{ width: "5.2cqw", height: "5.2cqw" }}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="12" cy="10" r="3" /><path d="M6.5 21c1-3 3.2-4.5 5.5-4.5s4.5 1.5 5.5 4.5" /></svg>}
                                    </span>
                                ))}
                            </div>
                            {/* grid */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5 }}>
                                {list.map((s, j) => (
                                    <div key={j} style={{ aspectRatio: "3 / 4", background: "#eee url(" + s + ") " + (crops[j] || "center / cover") + " no-repeat" }} />
                                ))}
                            </div>
                        </div>
                        {/* bottom nav */}
                        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "8.6%", background: "#fff", borderTop: "1px solid #efefef", display: "flex", justifyContent: "space-around", alignItems: "flex-start", paddingTop: "2.6cqw", boxSizing: "border-box" }}>
                            <svg {...ico} viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" /></svg>
                            <svg {...ico} viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
                            <svg {...ico} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" /><path d="M12 8v8M8 12h8" /></svg>
                            <svg {...ico} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" /><path d="M3 8h18M9 3l3 5M15 3l3 5M10 11.5v5l4.5-2.5z" /></svg>
                            <span style={{ width: "6.2cqw", height: "6.2cqw", borderRadius: "50%", background: avBg, boxShadow: "0 0 0 1.5px #000" }} />
                            <div style={{ position: "absolute", left: "35%", right: "35%", bottom: "12%", height: 4, borderRadius: 4, background: "#000" }} />
                        </div>
                    </div>
                </div>
            </div>
            {props.hint && (
                <div style={{ marginTop: 18, display: "flex", justifyContent: "center", alignItems: "center", gap: 8, font: "500 12px/1.4 'DM Sans', system-ui, sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "#6f6c66", textAlign: "center" }}>
                    <span style={{ flex: "none", width: 6, height: 6, borderRadius: "50%", background: "#C2456E", animation: tapped ? "none" : "igpPulse 1.6s ease-in-out infinite" }} />
                    {props.hint}
                </div>
            )}
        </div>
    )
}

IgProfile.defaultProps = {
    handle: "commonground", name: "Common Ground", category: "Coffee shop",
    bio: "A café and creative space between U of T and TMU\nMeet, make things, feel at home ☕\nOpening Fall 2026 on St. George St",
    link: "commonground.com", postsCount: "6", followers: "1,248", following: "182",
    avatarZoom: 100, avatarX: 50, avatarY: 50, ring1: "#F2A65A", ring2: "#BC4BBC", ring3: "#1C6A96",
    highlightNames: "Menu, Events, Space, Team", hint: "Tap the profile picture to watch the story",
}

addPropertyControls(IgProfile, {
    posts: { type: ControlType.Array, title: "Posts", control: { type: ControlType.Image } },
    highlights: { type: ControlType.Array, title: "Highlights", control: { type: ControlType.Image } },
    highlightNames: { type: ControlType.String, title: "Highlight names" },
    handle: { type: ControlType.String, title: "Handle" },
    name: { type: ControlType.String, title: "Name" },
    category: { type: ControlType.String, title: "Category" },
    bio: { type: ControlType.String, title: "Bio", displayTextArea: true },
    link: { type: ControlType.String, title: "Link" },
    postsCount: { type: ControlType.String, title: "Posts #" },
    followers: { type: ControlType.String, title: "Followers" },
    following: { type: ControlType.String, title: "Following" },
    avatar: { type: ControlType.Image, title: "Avatar" },
    avatarZoom: { type: ControlType.Number, title: "Avatar zoom", min: 100, max: 2000, unit: "%" },
    avatarX: { type: ControlType.Number, title: "Avatar X", min: 0, max: 100, unit: "%" },
    avatarY: { type: ControlType.Number, title: "Avatar Y", min: 0, max: 100, unit: "%" },
    ring1: { type: ControlType.Color, title: "Ring 1" },
    ring2: { type: ControlType.Color, title: "Ring 2" },
    ring3: { type: ControlType.Color, title: "Ring 3" },
    crops: { type: ControlType.String, title: "Post crops", displayTextArea: true },
    hint: { type: ControlType.String, title: "Hint" },
})
