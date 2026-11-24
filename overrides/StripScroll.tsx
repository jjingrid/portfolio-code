import { RenderTarget } from "framer"
import { forwardRef, useCallback, useEffect, useRef, useState, type ComponentType } from "react"
import { animate, motionValue, useMotionValue, useSpring, useTransform } from "framer-motion"

// One shared value: the strip writes it, the dot reads it
const progress = motionValue(0)
const velocity = motionValue(0)

function useMergedRef(ref: any) {
	const local = useRef<HTMLElement | null>(null)
	const set = useCallback((node: HTMLElement | null) => {
		local.current = node
		if (typeof ref === "function") ref(node)
		else if (ref) ref.current = node
	}, [ref])
	return [local, set] as const
}

// Put on the horizontal strip: smooth momentum scrolling, reports progress and speed
export function withStripScroll(Component: ComponentType<any>): ComponentType<any> {
	return forwardRef<any, any>(function StripScroll(props, ref) {
		const [local, setRef] = useMergedRef(ref)
		useEffect(() => {
			const el = local.current
			if (!el) return
			const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
			let target = el.scrollLeft
			let anim = 0
			let last = el.scrollLeft
			let idle: any = 0
			let raf = 0
			const maxOf = () => Math.max(0, el.scrollWidth - el.clientWidth)
			const report = () => {
				raf = 0
				const max = maxOf()
				progress.set(max > 0 ? el.scrollLeft / max : 0)
			}
			const onScroll = () => {
				const now = el.scrollLeft
				if (!reduce) velocity.set(now - last)
				last = now
				if (!anim) target = now
				clearTimeout(idle)
				idle = setTimeout(() => velocity.set(0), 60)
				if (!raf) raf = requestAnimationFrame(report)
			}
			// keep our own float position so browsers that round scrollLeft can't stall the easing
			let pos = el.scrollLeft
			el.style.scrollBehavior = "auto"
			el.style.scrollSnapType = "none"
			const step = () => {
				const max = maxOf()
				target = Math.max(0, Math.min(max, target))
				const diff = target - pos
				if (Math.abs(diff) < 0.75) { pos = target; el.scrollLeft = target; anim = 0; return }
				pos += diff * 0.14
				el.scrollLeft = pos
				anim = requestAnimationFrame(step)
			}
			const startAnim = () => { if (!anim) { pos = el.scrollLeft; anim = requestAnimationFrame(step) } }
			const locked = () => {
				const h = getComputedStyle(document.documentElement).overflow
				const bo = getComputedStyle(document.body).overflow
				return h === "hidden" || bo === "hidden"
			}
			const stripInView = () => {
				const r = el.getBoundingClientRect()
				const vh = window.innerHeight
				return r.top <= 2 && r.bottom >= vh * 0.6
			}
			let backSum = 0
			let backIdle: any = 0
			// Touch: swiping down at the first card brings the opening screen back
			let tStartX = 0, tStartY = 0
			const onTStart = (e: TouchEvent) => { tStartX = e.touches[0]?.clientX ?? 0; tStartY = e.touches[0]?.clientY ?? 0 }
			const onTEnd = (e: TouchEvent) => {
				const t = e.changedTouches[0]; if (!t) return
				const dx = t.clientX - tStartX, dy = t.clientY - tStartY
				if (locked() || !stripInView()) return
				if (dy > 70 && Math.abs(dx) < dy * 0.6 && el.scrollLeft <= 4 && (window.scrollY || 0) <= 2 && Date.now() - ((window as any).__yjLiftAt || 0) > 1200) window.dispatchEvent(new Event("yj-intro-back"))
			}
			window.addEventListener("touchstart", onTStart, { passive: true })
			window.addEventListener("touchend", onTEnd, { passive: true })
			// Vertical wheel anywhere on the page moves the strip while it is on screen
			const onWheel = (e: WheelEvent) => {
				if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) { if (anim) { cancelAnimationFrame(anim); anim = 0 } return }
				if (locked() || !stripInView()) return
				// swallow the leftover trackpad momentum from the swipe that lifted the opening screen
				if (Date.now() - ((window as any).__yjLiftAt || 0) < 1400) { e.preventDefault(); return }
				const max = maxOf()
				if (max <= 0) return
				if (!anim) target = el.scrollLeft
				if (e.deltaY < 0 && target <= 0) {
					// at the first card: a firm upward scroll brings the opening screen back down
					if (false) {
						clearTimeout(backIdle)
						backIdle = setTimeout(() => { backSum = 0 }, 250)
						backSum += -e.deltaY
						if (backSum > 80) { backSum = 0; e.preventDefault(); window.dispatchEvent(new Event("yj-intro-back")) }
					}
					return
				}
				if (e.deltaY > 0 && target >= max - 1) return
				e.preventDefault()
				const d = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY
				target = Math.max(0, Math.min(max, target + d * 1.4))
				if (reduce) { el.scrollLeft = target; return }
				startAnim()
			}
			// Click-and-drag with a mouse
			let down = false, moved = false, startX = 0, startLeft = 0
			const onDown = (e: PointerEvent) => {
				if (e.pointerType !== "mouse" || e.button !== 0) return
				down = true; moved = false; startX = e.clientX; startLeft = el.scrollLeft
				if (anim) { cancelAnimationFrame(anim); anim = 0 }
			}
			const onMove = (e: PointerEvent) => {
				if (!down) return
				const dx = e.clientX - startX
				if (!moved && Math.abs(dx) > 6) { moved = true; el.style.cursor = "grabbing" }
				if (moved) { el.scrollLeft = startLeft - dx; target = el.scrollLeft }
			}
			const onUp = () => { if (!down) return; down = false; el.style.cursor = "" ; if (moved) setTimeout(() => { moved = false }, 0) }
			const onClickCapture = (e: MouseEvent) => { if (moved) { e.preventDefault(); e.stopPropagation() } }
			const onDragStart = (e: DragEvent) => e.preventDefault()
			const onReset = () => { if (anim) { cancelAnimationFrame(anim); anim = 0 } el.scrollLeft = 0; target = 0; pos = 0 }
			window.addEventListener("yj-strip-reset", onReset)
			const onGoto = (e: any) => { const p = Math.max(0, Math.min(1, Number(e?.detail) || 0)); target = p * maxOf(); if (reduce) { el.scrollLeft = target; return } startAnim() }
			window.addEventListener("yj-strip-goto", onGoto)
			el.addEventListener("scroll", onScroll, { passive: true })
			window.addEventListener("wheel", onWheel, { passive: false })
			el.addEventListener("pointerdown", onDown)
			window.addEventListener("pointermove", onMove)
			window.addEventListener("pointerup", onUp)
			el.addEventListener("click", onClickCapture, true)
			el.addEventListener("dragstart", onDragStart)
			report()
			return () => {
				el.removeEventListener("scroll", onScroll)
				window.removeEventListener("wheel", onWheel)
				window.removeEventListener("touchstart", onTStart)
				window.removeEventListener("touchend", onTEnd)
				clearTimeout(backIdle)
				window.removeEventListener("yj-strip-reset", onReset)
				window.removeEventListener("yj-strip-goto", onGoto)
				el.removeEventListener("pointerdown", onDown)
				window.removeEventListener("pointermove", onMove)
				window.removeEventListener("pointerup", onUp)
				el.removeEventListener("click", onClickCapture, true)
				el.removeEventListener("dragstart", onDragStart)
				if (raf) cancelAnimationFrame(raf)
				if (anim) cancelAnimationFrame(anim)
				clearTimeout(idle)
			}
		}, [])
		return <Component {...props} ref={setRef} />
	})
}

// Put on each card: turns on its left edge like a book page, harder the faster you scroll
export function withSpeedLean(Component: ComponentType<any>): ComponentType<any> {
	return forwardRef<any, any>(function PageTurn(props, ref) {
		const v = useSpring(velocity, { stiffness: 140, damping: 22, mass: 0.8 })
		const rotateY = useTransform(v, (s) => Math.max(-50, Math.min(50, -s * 0.9)))
		const { style, ...rest } = props
		return (
			<Component
				{...rest}
				ref={ref}
				style={{ ...style, rotateY, transformPerspective: 1400, originX: 0, originY: 0.5 }}
			/>
		)
	})
}

// Put on the ruler dot: slides along its track as the strip scrolls
export function withScrollDot(Component: ComponentType<any>): ComponentType<any> {
	return forwardRef<any, any>(function ScrollDot(props, ref) {
		const [local, setRef] = useMergedRef(ref)
		const [travel, setTravel] = useState(0)
		useEffect(() => {
			const el = local.current
			const parent = el?.parentElement
			if (!el || !parent || typeof ResizeObserver === "undefined") return
			const measure = () => setTravel(Math.max(0, parent.clientWidth - el.offsetWidth - el.offsetLeft - 8))
			measure()
			const ro = new ResizeObserver(measure)
			ro.observe(parent)
			return () => ro.disconnect()
		}, [])
		const x = useTransform(progress, (p) => p * travel)
		// pop-ups lock page scrolling; hide the dot while that lock is on
		const [locked, setLocked] = useState(false)
		useEffect(() => {
			if (typeof document === "undefined" || typeof MutationObserver === "undefined") return
			const check = () => {
				const b = getComputedStyle(document.body).overflow
				const h = getComputedStyle(document.documentElement).overflow
				setLocked(b === "hidden" || h === "hidden")
			}
			check()
			const mo = new MutationObserver(check)
			mo.observe(document.body, { attributes: true, attributeFilter: ["style", "class"] })
			mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] })
			return () => mo.disconnect()
		}, [])
		const { style, ...rest } = props
		return <Component {...rest} ref={setRef} style={{ ...style, x, opacity: locked ? 0 : 1 }} />
	})
}

// Put on a card caption: hidden until the pointer is over its card (always shown on touch screens)
export function withHoverCaption(Component: ComponentType<any>): ComponentType<any> {
	return forwardRef<any, any>(function HoverCaption(props, ref) {
		const [local, setRef] = useMergedRef(ref)
		const [canHover, setCanHover] = useState(false)
		const [shown, setShown] = useState(false)
		useEffect(() => {
			const el = local.current
			const card = el?.parentElement
			if (!el || !card || typeof window === "undefined") return
			const mq = window.matchMedia("(hover: hover) and (pointer: fine)")
			const sync = () => setCanHover(mq.matches)
			sync()
			mq.addEventListener?.("change", sync)
			const on = () => setShown(true)
			const off = () => setShown(false)
			const offFocus = (e: FocusEvent) => { if (!card.contains(e.relatedTarget as Node)) setShown(false) }
			card.addEventListener("mouseenter", on)
			card.addEventListener("mouseleave", off)
			card.addEventListener("focusin", on)
			card.addEventListener("focusout", offFocus)
			return () => {
				mq.removeEventListener?.("change", sync)
				card.removeEventListener("mouseenter", on)
				card.removeEventListener("mouseleave", off)
				card.removeEventListener("focusin", on)
				card.removeEventListener("focusout", offFocus)
			}
		}, [])
		const visible = !canHover || shown
		const { style, ...rest } = props
		return (
			<Component
				{...rest}
				ref={setRef}
				style={{
					...style,
					opacity: visible ? 1 : 0,
					translate: visible ? "0 0" : "0 6px",
					transition: "opacity 0.35s ease, translate 0.35s ease",
				}}
			/>
		)
	})
}

// Put on a label layer inside a card image: fades in over the image while the pointer is on it
export function withHoverOverlay(Component: ComponentType<any>): ComponentType<any> {
	return forwardRef<any, any>(function HoverOverlay(props, ref) {
		const [local, setRef] = useMergedRef(ref)
		const [shown, setShown] = useState(false)
		useEffect(() => {
			const el = local.current
			const host = el?.parentElement
			if (!el || !host) return
			const card = host.parentElement || host
			const on = () => setShown(true)
			const off = () => setShown(false)
			const offFocus = (e: FocusEvent) => { if (!card.contains(e.relatedTarget as Node)) setShown(false) }
			host.addEventListener("mouseenter", on)
			host.addEventListener("mouseleave", off)
			card.addEventListener("focusin", on)
			card.addEventListener("focusout", offFocus)
			return () => {
				host.removeEventListener("mouseenter", on)
				host.removeEventListener("mouseleave", off)
				card.removeEventListener("focusin", on)
				card.removeEventListener("focusout", offFocus)
			}
		}, [])
		const { style, ...rest } = props
		return (
			<Component
				{...rest}
				ref={setRef}
				style={{ ...style, opacity: shown ? 1 : 0, transition: "opacity 0.35s ease", pointerEvents: "none" }}
			/>
		)
	})
}

const HEART_MASK = "url(\"data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%2092%22%3E%3Cpath%20d%3D%22M50%2090%20C50%2090%202%2058.5%202%2028.5%20C2%2012.5%2013.5%202%2028%202%20C38%202%2046%207.5%2050%2016%20C54%207.5%2062%202%2072%202%20C86.5%202%2098%2012.5%2098%2028.5%20C98%2058.5%2050%2090%2050%2090%20Z%22%20fill%3D%22black%22%2F%3E%3C%2Fsvg%3E\")"

// Put on a frame with an image fill: cuts it into a heart
export function withHeartMask(Component: ComponentType<any>): ComponentType<any> {
	return forwardRef<any, any>(function HeartMask(props, ref) {
		const { style, ...rest } = props
		const mask = { maskImage: HEART_MASK, WebkitMaskImage: HEART_MASK, maskSize: "100% 100%", WebkitMaskSize: "100% 100%", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat" }
		return <Component {...rest} ref={ref} style={{ ...style, ...mask }} />
	})
}

// Put on a horizontal row inside a pop-up: the mouse wheel moves it sideways, with easing
export function withRowScroll(Component: ComponentType<any>): ComponentType<any> {
	return forwardRef<any, any>(function RowScroll(props, ref) {
		const [local, setRef] = useMergedRef(ref)
		useEffect(() => {
			const el = local.current
			if (!el) return
			let target = el.scrollLeft
			let anim = 0
			const step = () => {
				const diff = target - el.scrollLeft
				if (Math.abs(diff) < 0.5) { el.scrollLeft = target; anim = 0; return }
				el.scrollLeft += diff * 0.12
				anim = requestAnimationFrame(step)
			}
			const onWheel = (e: WheelEvent) => {
				if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
				const max = el.scrollWidth - el.clientWidth
				if (max <= 0) return
				if (!anim) target = el.scrollLeft
				if ((e.deltaY < 0 && target <= 0) || (e.deltaY > 0 && target >= max - 1)) return
				e.preventDefault()
				const d = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY
				target = Math.max(0, Math.min(max, target + d * 1.2))
				if (!anim) anim = requestAnimationFrame(step)
			}
			el.addEventListener("wheel", onWheel, { passive: false })
			return () => { el.removeEventListener("wheel", onWheel); if (anim) cancelAnimationFrame(anim) }
		}, [])
		return <Component {...props} ref={setRef} />
	})
}

// ---- Intro: a full-screen curtain shown on every page load, then lifted to reveal the work ----
const INTRO_KEY = "yj-intro-seen"
function introAlreadySeen() {
	// one-time skip, set only by a "Projects" link; a normal visit or refresh always opens on the opening screen
	try { const skip = sessionStorage.getItem(INTRO_KEY) === "1"; if (skip) sessionStorage.removeItem(INTRO_KEY); return skip } catch { return false }
}

// Put on the full-screen intro frame: stays until the visitor scrolls, swipes or presses a key, then lifts.
// A "yj-intro-show" event brings it back (used by the Home links).
export function withIntroCurtain(Component: ComponentType<any>): ComponentType<any> {
	return forwardRef<any, any>(function IntroCurtain(props, ref) {
		const onCanvas = RenderTarget.current() === RenderTarget.canvas
		const [gone, setGone] = useState(() => (typeof window === "undefined" ? false : introAlreadySeen()))
		const [lifting, setLifting] = useState(false)
		const [round, setRound] = useState(0)
		const [fromTop, setFromTop] = useState(false)
		useEffect(() => {
			if (onCanvas) return
			const show = () => { setFromTop(false); setLifting(false); setGone(false); setRound((r) => r + 1) }
			const back = () => { setFromTop(true); setLifting(false); setGone(false); setRound((r) => r + 1) }
			window.addEventListener("yj-intro-show", show)
			window.addEventListener("yj-intro-back", back)
			return () => { window.removeEventListener("yj-intro-show", show); window.removeEventListener("yj-intro-back", back) }
		}, [])
		// once lifted: scrolling up at the very top of the page brings the opening screen back down
		useEffect(() => {
			if (onCanvas || !gone) return
			let sum = 0, idle: any = 0, ty = 0
			const ready = () => (window.scrollY || 0) <= 2 && Date.now() - ((window as any).__yjLiftAt || 0) > 1200 && getComputedStyle(document.body).overflow !== "hidden"
			const onWheel = (e: WheelEvent) => {
				if (e.deltaY >= 0 || !ready()) { sum = 0; return }
				clearTimeout(idle); idle = setTimeout(() => { sum = 0 }, 250)
				sum += -e.deltaY
				if (sum > 80) { sum = 0; window.dispatchEvent(new Event("yj-intro-back")) }
			}
			const onTS = (e: TouchEvent) => { ty = e.touches[0]?.clientY ?? 0 }
			const onTE = (e: TouchEvent) => { const y = e.changedTouches[0]?.clientY ?? 0; if (y - ty > 70 && ready()) window.dispatchEvent(new Event("yj-intro-back")) }
			window.addEventListener("wheel", onWheel, { passive: true })
			window.addEventListener("touchstart", onTS, { passive: true })
			window.addEventListener("touchend", onTE, { passive: true })
			return () => { window.removeEventListener("wheel", onWheel); window.removeEventListener("touchstart", onTS); window.removeEventListener("touchend", onTE); clearTimeout(idle) }
		}, [gone])
		useEffect(() => {
			if (onCanvas || gone) return
			const html = document.documentElement
			const prev = html.style.overflow === "hidden" ? "" : html.style.overflow
			html.style.overflow = "hidden"
			try { window.scrollTo(0, 0) } catch {}
			let done = false
			let touchY = 0
			let t: any = 0
			const lift = () => {
				if (done) return
				done = true
				;(window as any).__yjLiftAt = Date.now()
				window.dispatchEvent(new Event("yj-strip-reset"))
				setLifting(true)
				html.style.overflow = prev
				cleanup()
				t = setTimeout(() => setGone(true), 1000)
			}
			const shownAt = Date.now()
			// after sliding back down, ignore the tail of the same scroll gesture
			const settling = () => fromTop && Date.now() - shownAt < 1100
			const onWheel = (e: WheelEvent) => { if (settling()) { e.preventDefault(); return } if (Math.abs(e.deltaY) > 2 || Math.abs(e.deltaX) > 2) { e.preventDefault(); lift() } }
			// dragging the pixel portrait shouldn't lift the opening screen
			let onPortrait = false
			const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0]?.clientY ?? 0; onPortrait = !!(e.target as HTMLElement)?.closest?.('[data-framer-name="Pixel Portrait"]') }
			const onTouchMove = (e: TouchEvent) => { if (settling() || onPortrait) return; const y = e.touches[0]?.clientY ?? 0; if (Math.abs(y - touchY) > 12) lift() }
			const onKey = (e: KeyboardEvent) => { if (["ArrowDown", "PageDown", " ", "Enter", "ArrowRight"].includes(e.key)) lift() }
			function cleanup() {
				window.removeEventListener("wheel", onWheel)
				window.removeEventListener("touchstart", onTouchStart)
				window.removeEventListener("touchmove", onTouchMove)
				window.removeEventListener("keydown", onKey)
				window.removeEventListener("yj-intro-lift", lift)
			}
			window.addEventListener("wheel", onWheel, { passive: false })
			window.addEventListener("touchstart", onTouchStart, { passive: true })
			window.addEventListener("touchmove", onTouchMove, { passive: true })
			window.addEventListener("keydown", onKey)
			window.addEventListener("yj-intro-lift", lift)
			return () => { cleanup(); clearTimeout(t); if (!done) html.style.overflow = prev }
		}, [gone, round])
		if (onCanvas || gone) return null
		const { style, ...rest } = props
		return (
			<Component
				{...rest}
				key={round}
				ref={ref}
				style={{ ...style, zIndex: 300 }}
				initial={{ y: fromTop ? "-100%" : "0%" }}
				animate={{ y: lifting ? "-100%" : "0%" }}
				transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
			/>
		)
	})
}

// Put on each line of intro text; set a delay by the layer order via the "data-i" trick below
function introText(delay: number) {
	return function (Component: ComponentType<any>): ComponentType<any> {
		return forwardRef<any, any>(function IntroText(props, ref) {
			const { style, ...rest } = props
			return (
				<Component
					{...rest}
					ref={ref}
					style={{ ...style }}
					initial={{ opacity: 0, y: 48 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
				/>
			)
		})
	}
}
export function withIntroLine1(Component: ComponentType<any>): ComponentType<any> { return introText(0.15)(Component) }
export function withIntroLine2(Component: ComponentType<any>): ComponentType<any> { return introText(0.4)(Component) }
export function withIntroLine3(Component: ComponentType<any>): ComponentType<any> { return introText(0.65)(Component) }

// Put on the thin progress line: grows from left to right before the curtain lifts
export function withIntroBar(Component: ComponentType<any>): ComponentType<any> {
	return forwardRef<any, any>(function IntroBar(props, ref) {
		const { style, ...rest } = props
		return (
			<Component
				{...rest}
				ref={ref}
				style={{ ...style, originX: 0 }}
				initial={{ scaleX: 0 }}
				animate={{ scaleX: 1 }}
				transition={{ delay: 0.4, duration: 1.8, ease: [0.65, 0, 0.35, 1] }}
			/>
		)
	})
}

function makeIntro(delay: number, fromY: number, fromScale: number) {
	return function (Component: ComponentType<any>): ComponentType<any> {
		return forwardRef<any, any>(function Intro(props, ref) {
			const o = useMotionValue(0)
			const y = useMotionValue(fromY)
			const s = useMotionValue(fromScale)
			useEffect(() => {
				const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
				if (reduce) { o.set(1); y.set(0); s.set(1); return }
				const opts = { duration: 1.2, delay, ease: [0.22, 1, 0.36, 1] as any }
				const a = animate(o, 1, opts), b = animate(y, 0, opts), c = animate(s, 1, { ...opts, duration: 1.8 })
				return () => { a.stop(); b.stop(); c.stop() }
			}, [])
			const { style, ...rest } = props
			return <Component {...rest} ref={ref} style={{ ...style, opacity: o, y, scale: s }} />
		})
	}
}
// Intro on the home page: text rises in first, the photo follows and settles
export function withIntroText(Component: ComponentType<any>): ComponentType<any> { return makeIntro(0.15, 24, 1)(Component) }
export function withIntroSub(Component: ComponentType<any>): ComponentType<any> { return makeIntro(0.45, 16, 1)(Component) }
export function withIntroPhoto(Component: ComponentType<any>): ComponentType<any> { return makeIntro(0.35, 0, 1.04)(Component) }

// Put on a "Back" link: goes to the previous page on this site, or home if there is none
export function withHistoryBack(Component: ComponentType<any>): ComponentType<any> {
	return forwardRef<any, any>(function HistoryBack(props, ref) {
		const onClick = (e: any) => {
			try {
				const sameSite = document.referrer && new URL(document.referrer).origin === window.location.origin
				if (sameSite && window.history.length > 1) { e.preventDefault(); window.history.back() }
			} catch {}
		}
		return <Component {...props} ref={ref} onClickCapture={onClick} />
	})
}

// Put on a small bubble inside a button: clicking the button shows/hides it; clicking elsewhere or Esc closes it
export function withEmailBubble(Component: ComponentType<any>): ComponentType<any> {
	return forwardRef<any, any>(function EmailBubble(props, ref) {
		const [local, setRef] = useMergedRef(ref)
		const [open, setOpen] = useState(false)
		useEffect(() => {
			const el = local.current
			const btn = el?.parentElement
			if (!el || !btn) return
			const toggle = (e: MouseEvent) => { if (el.contains(e.target as Node)) return; setOpen((o) => !o) }
			const outside = (e: MouseEvent) => { if (!btn.contains(e.target as Node)) setOpen(false) }
			const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
			btn.addEventListener("click", toggle)
			document.addEventListener("click", outside)
			document.addEventListener("keydown", esc)
			return () => { btn.removeEventListener("click", toggle); document.removeEventListener("click", outside); document.removeEventListener("keydown", esc) }
		}, [])
		const { style, ...rest } = props
		return (
			<Component
				{...rest}
				ref={setRef}
				style={{ ...style, opacity: open ? 1 : 0, translate: open ? "0 0" : "0 6px", pointerEvents: open ? "auto" : "none", transition: "opacity 0.2s ease, translate 0.2s ease" }}
			/>
		)
	})
}


// Intro links: same hover for all three; "projects" also lifts the curtain
function introLink(liftOnClick: boolean) {
	return function (Component: ComponentType<any>): ComponentType<any> {
		return forwardRef<any, any>(function IntroLink(props, ref) {
			const { style, onClick, ...rest } = props
			return (
				<Component
					{...rest}
					ref={ref}
					style={{ ...style, cursor: "pointer" }}
					whileHover={{ opacity: 0.45 }}
					transition={{ duration: 0.2 }}
					onClick={(e: any) => {
						onClick?.(e)
						if (liftOnClick && typeof window !== "undefined") window.dispatchEvent(new Event("yj-intro-lift"))
					}}
				/>
			)
		})
	}
}
export function withIntroProjects(Component: ComponentType<any>): ComponentType<any> { return introLink(true)(Component) }
export function withIntroLink(Component: ComponentType<any>): ComponentType<any> { return introLink(false)(Component) }


// Close any open Framer overlay (menu) the same way the Escape key does
function closeOverlays() {
	try { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, bubbles: true })) } catch {}
}

// Put on any "Home" link: always lands on the opening screen (name + slogan)
export function withIntroHome(Component: ComponentType<any>): ComponentType<any> {
	return forwardRef<any, any>(function IntroHome(props, ref) {
		const { onClick, ...rest } = props
		return (
			<Component
				{...rest}
				ref={ref}
				onClick={(e: any) => {
					try { sessionStorage.removeItem(INTRO_KEY) } catch {}
					onClick?.(e)
					if (typeof window === "undefined") return
					closeOverlays()
					window.dispatchEvent(new Event("yj-intro-show"))
				}}
			/>
		)
	})
}

// Put on any "Projects" link: skips the opening screen and lands on the cards
export function withProjectsLink(Component: ComponentType<any>): ComponentType<any> {
	return forwardRef<any, any>(function ProjectsLink(props, ref) {
		const { onClick, ...rest } = props
		return (
			<Component
				{...rest}
				ref={ref}
				onClick={(e: any) => {
					try { sessionStorage.setItem(INTRO_KEY, "1") } catch {}
					onClick?.(e)
					if (typeof window === "undefined") return
					closeOverlays()
					window.dispatchEvent(new Event("yj-intro-lift"))
					const w = document.getElementById("work")
					if (w) { e?.preventDefault?.(); w.scrollIntoView({ behavior: "smooth", block: "start" }) }
				}}
			/>
		)
	})
}


// Put on the page's menu button: hides while a pop-up is open so it can't sit next to the pop-up's close button
export function withHideWhenPopup(Component: ComponentType<any>): ComponentType<any> {
	return forwardRef<any, any>(function HideWhenPopup(props, ref) {
		const [locked, setLocked] = useState(false)
		useEffect(() => {
			if (typeof document === "undefined" || typeof MutationObserver === "undefined") return
			const check = () => {
				const b = getComputedStyle(document.body).overflow
				const h = getComputedStyle(document.documentElement).overflow
				setLocked(b === "hidden" || h === "hidden")
			}
			check()
			const mo = new MutationObserver(check)
			mo.observe(document.body, { attributes: true, attributeFilter: ["style", "class"] })
			mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] })
			return () => mo.disconnect()
		}, [])
		const { style, ...rest } = props
		return <Component {...rest} ref={ref} style={{ ...style, opacity: locked ? 0 : 1, pointerEvents: locked ? "none" : undefined, transition: "opacity 0.2s" }} />
	})
}


// Live Toronto time, like the vertical clock on Cargo
function torontoTime() {
	try {
		return new Date().toLocaleTimeString("en-GB", { timeZone: "America/Toronto", hour12: false })
	} catch (e) {
		return new Date().toTimeString().slice(0, 8)
	}
}
export function withTorontoClock(Component): ComponentType {
	return forwardRef((props: any, ref) => {
		// coordinates "travel" as the page scrolls, like moving across a map
		const [y, setY] = useState(0)
		useEffect(() => {
			if (RenderTarget.current() === RenderTarget.canvas) return
			let raf = 0
			const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; setY(window.scrollY || 0) }) }
			onScroll()
			window.addEventListener("scroll", onScroll, { passive: true })
			return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf) }
		}, [])
		const lat = (43.6532 - y * 0.00002).toFixed(4)
		const lng = (79.3832 + y * 0.000015).toFixed(4)
		return <Component {...props} ref={ref} text={lat + "° N, " + lng + "° W"} style={{ ...props.style, fontVariantNumeric: "tabular-nums" }} />
	})
}


// "About" on the intro: lift the curtain, then open the Hello (About me) card
export function withIntroAbout(Component): ComponentType {
	return forwardRef((props: any, ref) => {
		const [hover, setHover] = useState(false)
		const onClick = (e: any) => {
			e?.preventDefault?.()
			window.dispatchEvent(new Event("yj-intro-lift"))
			setTimeout(() => {
				const tile = document.querySelector('[data-framer-name="Hello Tile"]') as HTMLElement | null
				if (tile) tile.click()
			}, 1150)
		}
		return (
			<Component
				{...props}
				ref={ref}
				onClick={onClick}
				onMouseEnter={() => setHover(true)}
				onMouseLeave={() => setHover(false)}
				style={{ ...props.style, cursor: "pointer", opacity: hover ? 0.45 : 1, transition: "opacity 0.2s" }}
			/>
		)
	})
}


// Little round photo next to the name on the intro.
// Hover = grows a bit. The click opens the About pop-up through Framer's own overlay on this layer.
export function withPhotoAbout(Component: ComponentType<any>): ComponentType<any> {
	return forwardRef<any, any>(function PhotoAbout(props, ref) {
		const [hover, setHover] = useState(false)
		const { style, onMouseEnter, onMouseLeave, ...rest } = props
		return (
			<Component
				{...rest}
				ref={ref}
				onMouseEnter={(e: any) => { setHover(true); onMouseEnter?.(e) }}
				onMouseLeave={(e: any) => { setHover(false); onMouseLeave?.(e) }}
				// after the About pop-up closes the pointer is still on the photo but no "enter" fires,
				// so any small movement over it brings the hover size back
				onMouseMove={() => { if (!hover) setHover(true) }}
				style={{
					...style,
					cursor: "pointer",
					transform: hover ? "scale(1.3)" : "scale(1)",
					transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
				}}
			/>
		)
	})
}


// Put on each ruler segment: clicking it slides the strip (and the heart) to that point on the ruler
export function withRulerJump(Component: ComponentType<any>): ComponentType<any> {
	return forwardRef<any, any>(function RulerJump(props, ref) {
		const [local, setRef] = useMergedRef(ref)
		const { style, onClick, ...rest } = props
		const go = (e: any) => {
			onClick?.(e)
			const seg = local.current
			const parent = seg?.parentElement
			if (!seg || !parent || typeof window === "undefined") return
			let dotW = 30, dotL = 15
			for (const c of Array.from(parent.children) as HTMLElement[]) {
				if (getComputedStyle(c).position === "absolute") { dotW = c.offsetWidth; dotL = c.offsetLeft; break }
			}
			const travel = Math.max(1, parent.clientWidth - dotW - dotL - 8)
			window.dispatchEvent(new CustomEvent("yj-strip-goto", { detail: seg.offsetLeft / travel }))
		}
		return <Component {...rest} ref={setRef} onClick={go} style={{ ...style, cursor: "pointer" }} />
	})
}


// Put on an image: shows it in black and white
export function withGrayscale(Component: ComponentType<any>): ComponentType<any> {
	return forwardRef<any, any>(function Grayscale(props, ref) {
		const { style, ...rest } = props
		return <Component {...rest} ref={ref} style={{ ...style, filter: "grayscale(1)" }} />
	})
}


// Put on a card: grows a little when the pointer is over it
// One shared "View" cursor that follows the pointer over project cards
let viewDot: HTMLDivElement | null = null
function getViewDot() {
	if (typeof document === "undefined") return null
	if (viewDot && document.body.contains(viewDot)) return viewDot
	const d = document.createElement("div")
	d.textContent = "View"
	Object.assign(d.style, {
		position: "fixed", left: "0px", top: "0px", width: "72px", height: "72px", borderRadius: "50%",
		background: "#1a1814", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
		font: "500 11px 'DM Sans', sans-serif", letterSpacing: "0.08em", textTransform: "uppercase",
		pointerEvents: "none", zIndex: "9999", transform: "translate(-50%, -50%) scale(0)", opacity: "0",
		transition: "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s",
	} as any)
	document.body.appendChild(d)
	viewDot = d
	return d
}
const canHover = () => typeof window !== "undefined" && !!window.matchMedia?.("(hover: hover) and (pointer: fine)").matches

// Put on a card: grows a little when the pointer is over it, and swaps the pointer for a round "View" cursor
export function withHoverZoom(Component: ComponentType<any>): ComponentType<any> {
	return forwardRef<any, any>(function HoverZoom(props, ref) {
		const [hover, setHover] = useState(false)
		const { style, onMouseEnter, onMouseLeave, onMouseMove, ...rest } = props
		const fancy = canHover() && RenderTarget.current() !== RenderTarget.canvas
		const place = (e: any) => { const d = getViewDot(); if (d) { d.style.left = e.clientX + "px"; d.style.top = e.clientY + "px" } }
		useEffect(() => () => { const d = viewDot; if (d) { d.style.opacity = "0"; d.style.transform = "translate(-50%, -50%) scale(0)" } }, [])
		return (
			<Component
				{...rest}
				ref={ref}
				onMouseEnter={(e: any) => {
					setHover(true); onMouseEnter?.(e)
					if (fancy) { const d = getViewDot(); if (d) { place(e); d.style.opacity = "1"; d.style.transform = "translate(-50%, -50%) scale(1)" } }
				}}
				onMouseMove={(e: any) => { onMouseMove?.(e); if (fancy) place(e) }}
				onMouseLeave={(e: any) => {
					setHover(false); onMouseLeave?.(e)
					const d = viewDot; if (d) { d.style.opacity = "0"; d.style.transform = "translate(-50%, -50%) scale(0)" }
				}}
				style={{ ...style, transform: hover ? "scale(1.05)" : "scale(1)", transition: "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)", zIndex: hover ? 2 : 1, position: "relative", cursor: fancy ? "none" : style?.cursor }}
			/>
		)
	})
}


// Put on each project card: sizes it from the window height so it keeps the same proportion on any screen
export function withCardSize(Component: ComponentType<any>): ComponentType<any> {
	return forwardRef<any, any>(function CardSize(props, ref) {
		const { style, ...rest } = props
		if (RenderTarget.current() === RenderTarget.canvas) return <Component {...props} ref={ref} />
		return <Component {...rest} ref={ref} style={{ ...style, width: "min(max(240px, 40.5vh), 82vw)", flexShrink: 0 }} />
	})
}


// Put on a card outside the strip: opens the same pop-up as the matching card in the strip
function openStripCard(name: string) {
	if (typeof document === "undefined") return
	const all = Array.from(document.querySelectorAll('[data-framer-name="' + name + '"]')) as HTMLElement[]
	const el = all.find((e) => e.getClientRects().length > 0) || all[0]
	el?.click()
}
function opener(name: string) {
	return function (Component: ComponentType<any>): ComponentType<any> {
		return forwardRef<any, any>(function OpenCard(props, ref) {
			const { onClick, style, ...rest } = props
			return <Component {...rest} ref={ref} style={{ ...style, cursor: "pointer" }} onClick={(e: any) => { onClick?.(e); openStripCard(name) }} />
		})
	}
}
export function withOpenUX(C: ComponentType<any>): ComponentType<any> { return opener("Appointment booking research")(C) }
export function withOpenGemina(C: ComponentType<any>): ComponentType<any> { return opener("Gemina")(C) }
export function withOpenGIS(C: ComponentType<any>): ComponentType<any> { return opener("Mapping work")(C) }
export function withOpenPhoto(C: ComponentType<any>): ComponentType<any> { return opener("Photo circle (About)")(C) }
export function withOpenHello(C: ComponentType<any>): ComponentType<any> { return opener("Hello")(C) }


// Bubbles next to the photo: two messages take turns popping in and out
function bubble(delay: number) {
	return function (Component: ComponentType<any>): ComponentType<any> {
		return forwardRef<any, any>(function Bubble(props, ref) {
			const { style, ...rest } = props
			return (
				<Component
					{...rest}
					ref={ref}
					style={{ ...style, pointerEvents: "none", transformOrigin: "0% 100%" }}
					initial={{ opacity: 0, scale: 0.4, y: 6 }}
					animate={{ opacity: [0, 1, 1, 1, 1, 0], scale: [0.4, 1.08, 0.97, 1.02, 1, 0.7], y: [6, -2, 0, -1, 0, 4], rotate: [-6, 3, -2, 1, 0, 0] }}
					transition={{ duration: 3.4, times: [0, 0.1, 0.18, 0.26, 0.88, 1], repeat: Infinity, repeatDelay: 4.4, delay, ease: "easeOut" }}
				/>
			)
		})
	}
}
export function withBubbleFirst(Component: ComponentType<any>): ComponentType<any> { return bubble(1)(Component) }
export function withBubbleSecond(Component: ComponentType<any>): ComponentType<any> { return bubble(4.9)(Component) }
export function withClickMeBubble(Component: ComponentType<any>): ComponentType<any> { return bubble(4.9)(Component) }

// Remember which list page a project was opened from ("/" Selected work, or "/work" All work),
// so the back arrow on a project page goes back to the right place.
const BACK_KEY = "cg-back-from"
const LIST_PAGES = ["/", "/work"]
if (typeof window !== "undefined" && !(window as any).__cgBackPatched) {
	;(window as any).__cgBackPatched = true
	const remember = () => {
		try {
			const p = window.location.pathname.replace(/\/+$/, "") || "/"
			if (LIST_PAGES.includes(p)) sessionStorage.setItem(BACK_KEY, p)
		} catch (e) {}
	}
	const push = history.pushState
	history.pushState = function (...args: any[]) { remember(); return push.apply(this, args as any) }
	// clicks on plain links (full page loads) too
	document.addEventListener("click", (e: any) => { const a = e.target && e.target.closest && e.target.closest("a[href]"); if (a) remember() }, true)
	// arriving back on the home page at #work: make sure we land on Selected work
	const toWork = () => {
		if ((window.location.pathname.replace(/\/+$/, "") || "/") !== "/" || window.location.hash !== "#work") return
		let n = 0
		const go = () => { const w = document.getElementById("work"); if (w) w.scrollIntoView({ block: "start" }); if (++n < 6) setTimeout(go, 250) }
		setTimeout(go, 150)
	}
	if (document.readyState === "complete") toWork(); else window.addEventListener("load", toWork)
}

function backTarget() {
	let from: string | null = null
	try { from = sessionStorage.getItem(BACK_KEY) } catch (err) {}
	return from === "/" ? "/#work" : "/work"
}

// Put on the project pages' back arrow: returns to Selected work (home) or All work, whichever the visitor came from
export function withSmartBack(Component: ComponentType<any>): ComponentType<any> {
	return forwardRef<any, any>(function SmartBack(props, ref) {
		const { onClick, ...rest } = props
		return (
			<Component
				{...rest}
				ref={ref}
				onClick={(e: any) => {
					if (typeof window === "undefined") return onClick?.(e)
					e?.preventDefault?.(); e?.stopPropagation?.()
					const to = backTarget()
					if (to === "/#work") { try { sessionStorage.setItem(INTRO_KEY, "1") } catch {} }
					closeOverlays()
					window.location.href = to
				}}
			/>
		)
	})
}

// Back arrow: Selected work (home) -> back to that section; All work -> back to /work
export function withGoBack(Component: ComponentType<any>): ComponentType<any> {
	return forwardRef<any, any>(function GoBack(props, ref) {
		const { style, onClick, ...rest } = props
		return (
			<Component
				{...rest}
				ref={ref}
				role="link"
				aria-label="Go back"
				style={{ ...style, cursor: "pointer" }}
				onClick={(e: any) => {
					onClick?.(e)
					if (typeof window === "undefined") return
					let from: string | null = null
					try { from = sessionStorage.getItem(BACK_KEY) } catch (err) {}
					if (from === "/") window.location.href = "/#work"
					else if (from === "/work") window.location.href = "/work"
					else window.location.href = "/"
				}}
			/>
		)
	})
}


// Put on a block of text: a soft pink spot follows the mouse and tints the letters under it.
export function withCursorTint(Component: ComponentType<any>): ComponentType<any> {
	return forwardRef<any, any>(function CursorTint(props, ref) {
		const [local, setRef] = useMergedRef(ref)
		const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
		const { style, onMouseMove, onMouseLeave, className, ...rest } = props
		const move = (e: any) => {
			onMouseMove?.(e)
			const el = local.current
			if (!el) return
			const r = el.getBoundingClientRect()
			setPos({ x: e.clientX - r.left, y: e.clientY - r.top })
		}
		const ink = "var(--token-Ycas7eAS0, #1a1814)"
		const spot = pos
			? `radial-gradient(170px circle at ${pos.x}px ${pos.y}px, #C2456E 0%, #E07A9B 35%, ${ink} 70%)`
			: `linear-gradient(${ink}, ${ink})`
		return (
			<>
				<style>{".yj-tint, .yj-tint *{ -webkit-text-fill-color: transparent !important; }"}</style>
				<Component
					{...rest}
					ref={setRef}
					className={(className ? className + " " : "") + "yj-tint"}
					onMouseMove={move}
					onMouseLeave={(e: any) => { setPos(null); onMouseLeave?.(e) }}
					style={{ ...style, backgroundImage: spot, WebkitBackgroundClip: "text", backgroundClip: "text" }}
				/>
			</>
		)
	})
}


// Back to top: slow eased scroll, pixel arrow keeps hopping up out of the box until the page arrives
export function withSlowTop(Component: ComponentType<any>): ComponentType<any> {
	return forwardRef<any, any>(function SlowTop(props, ref) {
		const [local, setRef] = useMergedRef(ref)
		const busy = useRef(false)
		const go = (e: any) => {
			e?.preventDefault?.()
			if (busy.current || typeof window === "undefined") return
			const start = window.scrollY
			if (start <= 0) return
			busy.current = true
			const arrow = local.current?.firstElementChild as HTMLElement | null
			const html = document.documentElement
			const prev = html.style.scrollBehavior
			html.style.scrollBehavior = "auto"
			const dur = Math.min(2400, Math.max(1400, start * 0.3))
			const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
			const steps = (n: number) => (t: number) => Math.floor(t * n) / n
			let loop: any = null
			if (arrow) {
				animate(arrow, { y: [0, -30] }, { duration: 0.28, ease: steps(5) }).then(() => {
					if (busy.current) loop = animate(arrow, { y: [30, -30] }, { duration: 0.5, ease: steps(10), repeat: Infinity })
				})
			}
			let cancelled = false
			const stop = () => { cancelled = true }
			window.addEventListener("wheel", stop, { once: true, passive: true })
			window.addEventListener("touchstart", stop, { once: true, passive: true })
			const t0 = performance.now()
			const tick = (now: number) => {
				const p = Math.min(1, (now - t0) / dur)
				if (!cancelled) window.scrollTo(0, start * (1 - ease(p)))
				if (p < 1 && !cancelled) requestAnimationFrame(tick)
				else {
					html.style.scrollBehavior = prev
					window.removeEventListener("wheel", stop)
					window.removeEventListener("touchstart", stop)
					busy.current = false
					loop?.stop?.()
					if (arrow) animate(arrow, { y: [30, 0] }, { duration: 0.3, ease: steps(5) })
				}
			}
			requestAnimationFrame(tick)
		}
		return (
			<Component
				{...props}
				ref={setRef}
				onClick={(e: any) => { go(e); props.onClick?.(e) }}
				role="button"
				tabIndex={0}
				onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") go(e) }}
				style={{ ...props.style, overflow: "hidden", cursor: "pointer" }}
			/>
		)
	})
}
