import UIKit

class VirtualJoystick {

    var centerX: CGFloat = 200; var centerY: CGFloat = 600
    private var outerR: CGFloat = 120; private var innerR: CGFloat = 46

    private(set) var dirX: Float = 0
    private(set) var dirY: Float = 0
    private var thumbX: CGFloat; private var thumbY: CGFloat

    init() { thumbX = centerX; thumbY = centerY }

    func configure(cx: CGFloat, cy: CGFloat, radius: CGFloat) {
        centerX = cx; centerY = cy; outerR = radius; innerR = radius * 0.38
        thumbX = cx; thumbY = cy
    }

    func contains(_ p: CGPoint) -> Bool { hypot(p.x - centerX, p.y - centerY) <= outerR }

    func onTouchDown(_ p: CGPoint) { move(to: p) }
    func onTouchMove(_ p: CGPoint) { move(to: p) }
    func onTouchUp() { thumbX = centerX; thumbY = centerY; dirX = 0; dirY = 0 }

    private func move(to p: CGPoint) {
        let dx = p.x - centerX; let dy = p.y - centerY
        let dist = hypot(dx, dy); let max = outerR - innerR
        if dist > max {
            thumbX = centerX + (dx/dist)*max; thumbY = centerY + (dy/dist)*max
        } else { thumbX = p.x; thumbY = p.y }
        dirX = Float((thumbX - centerX) / max)
        dirY = Float((thumbY - centerY) / max)
    }

    func draw(in ctx: CGContext) {
        ctx.setFillColor(UIColor(white: 1, alpha: 0.25).cgColor)
        ctx.fillEllipse(in: CGRect(x: centerX-outerR, y: centerY-outerR, width: outerR*2, height: outerR*2))

        ctx.setStrokeColor(UIColor(white: 1, alpha: 0.6).cgColor)
        ctx.setLineWidth(3)
        ctx.strokeEllipse(in: CGRect(x: centerX-outerR, y: centerY-outerR, width: outerR*2, height: outerR*2))

        // Arrows
        let ar = outerR * 0.62
        drawArrow(ctx, x: centerX, y: centerY - ar, angle: 0)
        drawArrow(ctx, x: centerX, y: centerY + ar, angle: .pi)
        drawArrow(ctx, x: centerX - ar, y: centerY, angle: -.pi/2)
        drawArrow(ctx, x: centerX + ar, y: centerY, angle: .pi/2)

        ctx.setFillColor(UIColor(white: 1, alpha: 0.8).cgColor)
        ctx.fillEllipse(in: CGRect(x: thumbX-innerR, y: thumbY-innerR, width: innerR*2, height: innerR*2))
    }

    private func drawArrow(_ ctx: CGContext, x: CGFloat, y: CGFloat, angle: CGFloat) {
        ctx.saveGState()
        ctx.translateBy(x: x, y: y); ctx.rotate(by: angle)
        ctx.setStrokeColor(UIColor(white: 1, alpha: 0.65).cgColor); ctx.setLineWidth(3)
        ctx.move(to: .init(x: 0, y: -9)); ctx.addLine(to: .init(x: 0, y: 9)); ctx.strokePath()
        ctx.move(to: .init(x: -7, y: 2)); ctx.addLine(to: .init(x: 0, y: -7)); ctx.addLine(to: .init(x: 7, y: 2)); ctx.strokePath()
        ctx.restoreGState()
    }
}
