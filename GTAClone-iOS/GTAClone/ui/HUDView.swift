import UIKit

class HUDView: UIView {

    private let world: World3D
    private let joystick: VirtualJoystick

    init(frame: CGRect, world: World3D, joystick: VirtualJoystick) {
        self.world = world; self.joystick = joystick
        super.init(frame: frame)
        backgroundColor = .clear; isOpaque = false
        joystick.configure(cx: frame.width * 0.13, cy: frame.height * 0.72, radius: frame.height * 0.20)
    }
    required init?(coder: NSCoder) { fatalError() }

    override func draw(_ rect: CGRect) {
        guard let ctx = UIGraphicsGetCurrentContext() else { return }
        let w = rect.width; let h = rect.height
        joystick.draw(in: ctx)
        drawMiniMap(ctx, w: w, h: h)
        drawHealth(ctx, w: w, h: h)
        drawMoney(ctx, w: w)
        drawWanted(ctx, w: w)
        drawClock(ctx, w: w)
        drawButtons(ctx, w: w, h: h)
        if world.player.isInVehicle { drawHint(ctx, w: w, h: h) }
    }

    // ── Mini-map ──────────────────────────────────────────────────────────────
    private func drawMiniMap(_ ctx: CGContext, w: CGFloat, h: CGFloat) {
        let size = h * 0.22; let mx: CGFloat = 20; let my: CGFloat = 20
        let cs = CGFloat(world.city.citySize()); let scale = size / cs

        // Background
        ctx.setFillColor(UIColor(red:0.1,green:0.16,blue:0.1,alpha:0.75).cgColor)
        UIBezierPath(roundedRect: CGRect(x:mx,y:my,width:size,height:size), cornerRadius: 10).fill()

        // Road marks
        ctx.setFillColor(UIColor(white: 0.33, alpha: 1).cgColor)
        for slab in world.city.city.roadSlabs {
            // roadSlabs are Box3D from City3D — map center/size → minimap rect
        }
        // Simplified: draw road grid lines
        ctx.setStrokeColor(UIColor(white: 0.4, alpha: 1).cgColor); ctx.setLineWidth(1)
        let interval = CGFloat(world.city.BLOCK + world.city.ROAD) * scale
        var pos = CGFloat(world.city.BLOCK) * scale
        while pos < size { ctx.move(to: .init(x: mx+pos, y: my)); ctx.addLine(to: .init(x: mx+pos, y: my+size)); pos += interval }
        pos = CGFloat(world.city.BLOCK) * scale
        while pos < size { ctx.move(to: .init(x: mx, y: my+pos)); ctx.addLine(to: .init(x: mx+size, y: my+pos)); pos += interval }
        ctx.strokePath()

        // NPCs
        ctx.setFillColor(UIColor.white.cgColor)
        for n in world.npcs where n.health > 0 { ctx.fillEllipse(in: dot(mx + CGFloat(n.x)*scale, my + CGFloat(n.z)*scale, 2)) }

        // Vehicles
        ctx.setFillColor(UIColor.yellow.cgColor)
        for v in world.vehicles { ctx.fillEllipse(in: dot(mx + CGFloat(v.x)*scale, my + CGFloat(v.z)*scale, 3)) }

        // Player
        ctx.setFillColor(UIColor.green.cgColor)
        ctx.fillEllipse(in: dot(mx + CGFloat(world.player.x)*scale, my + CGFloat(world.player.z)*scale, 5))

        ctx.setStrokeColor(UIColor(white: 1, alpha: 0.65).cgColor); ctx.setLineWidth(2)
        UIBezierPath(roundedRect: CGRect(x:mx,y:my,width:size,height:size), cornerRadius: 10).stroke()
    }

    private func dot(_ x: CGFloat, _ y: CGFloat, _ r: CGFloat) -> CGRect { CGRect(x:x-r,y:y-r,width:r*2,height:r*2) }

    // ── Health ────────────────────────────────────────────────────────────────
    private func drawHealth(_ ctx: CGContext, w: CGFloat, h: CGFloat) {
        let bx: CGFloat = 20; let by = h*0.22 + 32; let bw: CGFloat = 180; let bh: CGFloat = 18
        let ratio = CGFloat(world.player.health / 100).clamped(0, 1)
        ctx.setFillColor(UIColor.black.withAlphaComponent(0.5).cgColor)
        UIBezierPath(roundedRect: CGRect(x:bx-4,y:by-4,width:bw+60,height:bh+8), cornerRadius: 5).fill()
        let hpColor: UIColor = ratio > 0.6 ? UIColor(red:0.3,green:0.76,blue:0.3,alpha:1) :
                               ratio > 0.3 ? UIColor(red:1,green:0.75,blue:0.1,alpha:1) :
                                             UIColor(red:0.95,green:0.25,blue:0.25,alpha:1)
        ctx.setFillColor(hpColor.cgColor)
        if ratio > 0 { UIBezierPath(roundedRect: CGRect(x:bx,y:by,width:bw*ratio,height:bh), cornerRadius: 4).fill() }
        let attrs: [NSAttributedString.Key: Any] = [.foregroundColor: UIColor.white, .font: UIFont.monospacedSystemFont(ofSize: 14, weight: .regular)]
        "HP \(Int(world.player.health))".draw(at: CGPoint(x: bx+bw+8, y: by+1), withAttributes: attrs)
    }

    // ── Money ─────────────────────────────────────────────────────────────────
    private func drawMoney(_ ctx: CGContext, w: CGFloat) {
        let s = String(format: "$%08d", world.player.money)
        let attrs: [NSAttributedString.Key: Any] = [.foregroundColor: UIColor(red:0.2,green:1,blue:0.2,alpha:1),
                                                     .font: UIFont.monospacedSystemFont(ofSize: 32, weight: .bold)]
        let sz = (s as NSString).size(withAttributes: attrs)
        s.draw(at: CGPoint(x: w - sz.width - 20, y: 18), withAttributes: attrs)
    }

    // ── Wanted stars ──────────────────────────────────────────────────────────
    private func drawWanted(_ ctx: CGContext, w: CGFloat) {
        let wl = world.player.wantedLevel
        for i in 0..<5 {
            let col: UIColor = i < wl ? .yellow : UIColor(white: 0.25, alpha: 1)
            let attrs: [NSAttributedString.Key: Any] = [.foregroundColor: col, .font: UIFont.systemFont(ofSize: 24, weight: .bold)]
            "★".draw(at: CGPoint(x: w - 180 + CGFloat(i)*34, y: 60), withAttributes: attrs)
        }
    }

    // ── Clock ─────────────────────────────────────────────────────────────────
    private func drawClock(_ ctx: CGContext, w: CGFloat) {
        let s = "12:45"
        let attrs: [NSAttributedString.Key: Any] = [.foregroundColor: UIColor.white,
                                                     .font: UIFont.monospacedSystemFont(ofSize: 26, weight: .bold)]
        let sz = (s as NSString).size(withAttributes: attrs)
        ctx.setFillColor(UIColor.black.withAlphaComponent(0.5).cgColor)
        UIBezierPath(roundedRect: CGRect(x: w/2-sz.width/2-12, y: 10, width: sz.width+24, height: 40), cornerRadius: 8).fill()
        s.draw(at: CGPoint(x: w/2 - sz.width/2, y: 16), withAttributes: attrs)
    }

    // ── Action buttons ────────────────────────────────────────────────────────
    private func drawButtons(_ ctx: CGContext, w: CGFloat, h: CGFloat) {
        let bs = h * 0.11; let mg: CGFloat = 20
        let rx = w - mg - bs; let by = h - mg - bs
        drawBtn(ctx, x: rx - bs*1.3, y: by - bs*1.3, s: bs, color: UIColor(red:1,green:0.67,blue:0,alpha:0.55), label: "CAR")
        drawBtn(ctx, x: rx, y: by, s: bs, color: UIColor(red:1,green:0.27,blue:0.27,alpha:0.55), label: "ATK")
        let runColor = world.player.sprinting ? UIColor(red:0.27,green:0.67,blue:1,alpha:0.80) : UIColor(red:0.27,green:0.67,blue:1,alpha:0.33)
        drawBtn(ctx, x: rx, y: by - bs*1.3, s: bs, color: runColor, label: "RUN")
    }

    private func drawBtn(_ ctx: CGContext, x: CGFloat, y: CGFloat, s: CGFloat, color: UIColor, label: String) {
        ctx.setFillColor(color.cgColor)
        UIBezierPath(roundedRect: CGRect(x:x,y:y,width:s,height:s), cornerRadius: s*0.28).fill()
        ctx.setStrokeColor(UIColor(white:1,alpha:0.5).cgColor); ctx.setLineWidth(2)
        UIBezierPath(roundedRect: CGRect(x:x,y:y,width:s,height:s), cornerRadius: s*0.28).stroke()
        let attrs: [NSAttributedString.Key: Any] = [.foregroundColor: UIColor.white,
                                                     .font: UIFont.boldSystemFont(ofSize: s * 0.27)]
        let sz = (label as NSString).size(withAttributes: attrs)
        label.draw(at: CGPoint(x: x + (s-sz.width)/2, y: y + (s-sz.height)/2 + 2), withAttributes: attrs)
    }

    // ── Vehicle hint ──────────────────────────────────────────────────────────
    private func drawHint(_ ctx: CGContext, w: CGFloat, h: CGFloat) {
        let msg = "DRAG RIGHT TO ORBIT  ·  TAP CAR TO EXIT"
        let attrs: [NSAttributedString.Key: Any] = [.foregroundColor: UIColor(red:1,green:0.67,blue:0,alpha:1),
                                                     .font: UIFont.monospacedSystemFont(ofSize: 16, weight: .regular)]
        let sz = (msg as NSString).size(withAttributes: attrs)
        ctx.setFillColor(UIColor.black.withAlphaComponent(0.5).cgColor)
        UIBezierPath(roundedRect: CGRect(x: w/2-sz.width/2-14, y: h-48, width: sz.width+28, height: 34), cornerRadius: 8).fill()
        msg.draw(at: CGPoint(x: w/2 - sz.width/2, y: h - 42), withAttributes: attrs)
    }
}

private extension CGFloat {
    func clamped(_ lo: CGFloat, _ hi: CGFloat) -> CGFloat { max(lo, min(hi, self)) }
}
