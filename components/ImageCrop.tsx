import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

/**
 * Shows one rectangular region of an image (crop given in source pixels).
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function ImageCrop(props) {
    const { image, srcW, srcH, x, y, w, h, radius } = props
    const src = typeof image === "string" ? image : image && image.src
    return (
        <div role="img" aria-label={props.alt} style={{ width: "100%", aspectRatio: w + " / " + h, borderRadius: radius, overflow: "hidden", backgroundImage: src ? "url(" + src + ")" : "none", backgroundColor: "#eee", backgroundRepeat: "no-repeat",
            backgroundSize: (srcW / w) * 100 + "% " + (srcH / h) * 100 + "%",
            backgroundPosition: (srcW === w ? 0 : (x / (srcW - w)) * 100) + "% " + (srcH === h ? 0 : (y / (srcH - h)) * 100) + "%" }} />
    )
}

ImageCrop.defaultProps = { srcW: 1600, srcH: 900, x: 0, y: 0, w: 800, h: 900, radius: 4, alt: "" }

addPropertyControls(ImageCrop, {
    image: { type: ControlType.Image, title: "Image" },
    srcW: { type: ControlType.Number, title: "Source W", min: 1, max: 10000 },
    srcH: { type: ControlType.Number, title: "Source H", min: 1, max: 10000 },
    x: { type: ControlType.Number, title: "Crop X", min: 0, max: 10000 },
    y: { type: ControlType.Number, title: "Crop Y", min: 0, max: 10000 },
    w: { type: ControlType.Number, title: "Crop W", min: 1, max: 10000 },
    h: { type: ControlType.Number, title: "Crop H", min: 1, max: 10000 },
    radius: { type: ControlType.Number, title: "Radius", min: 0, max: 40 },
    alt: { type: ControlType.String, title: "Alt" },
})
