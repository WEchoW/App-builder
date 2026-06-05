import SceneKit

class NPC3D: Entity3D {

    private var targetX: Float; private var targetZ: Float
    private var thinkTimer: Float

    init(x: Float, z: Float, shirtColor: UIColor) {
        targetX = x; targetZ = z
        thinkTimer = Float.random(in: 0...2)
        super.init(x: x, z: z)
        buildVisual(shirtColor: shirtColor)
    }

    private func buildVisual(shirtColor: UIColor) {
        let skin = UIColor(red: 0.9, green: 0.72, blue: 0.56, alpha: 1)
        let dark = UIColor(red: 0.28, green: 0.18, blue: 0.09, alpha: 1)

        // Legs
        let legs = SCNBox(width: 0.5, height: 0.9, length: 0.5, chamferRadius: 0.05)
        legs.firstMaterial?.diffuse.contents = dark
        let ln = SCNNode(geometry: legs); ln.position = SCNVector3(0, 0.45, 0)
        node.addChildNode(ln)

        // Body / shirt
        let body = SCNBox(width: 0.6, height: 0.8, length: 0.45, chamferRadius: 0.05)
        body.firstMaterial?.diffuse.contents = shirtColor
        let bn = SCNNode(geometry: body); bn.position = SCNVector3(0, 1.25, 0)
        node.addChildNode(bn)

        // Head
        let head = SCNSphere(radius: 0.28)
        head.firstMaterial?.diffuse.contents = skin
        let hn = SCNNode(geometry: head); hn.position = SCNVector3(0, 1.93, 0)
        node.addChildNode(hn)
    }

    func update(dt: Float, world: World3D) {
        guard health > 0 else { return }

        let player = world.player
        let dist   = distanceTo(player)

        if player.wantedLevel > 0 && dist < 25 {
            let a = atan2(z - player.z, x - player.x)
            targetX = x + cos(a) * 20; targetZ = z + sin(a) * 20
        } else {
            thinkTimer -= dt
            if thinkTimer <= 0 {
                targetX = x + Float.random(in: -12...12)
                targetZ = z + Float.random(in: -12...12)
                thinkTimer = Float.random(in: 1.5...4.5)
            }
        }

        let dx = targetX - x; let dz = targetZ - z
        let d  = hypot(dx, dz)
        if d > 0.5 {
            let spd: Float = (player.wantedLevel > 0 && dist < 25) ? 5.5 : 2.5
            rotY = atan2(dx, dz) * 180 / .pi
            let nx = x + (dx/d) * spd * dt; let nz = z + (dz/d) * spd * dt
            if !world.city.isBlocked(x: nx, z: z) { x = nx }
            if !world.city.isBlocked(x: x,  z: nz) { z = nz }
        }

        let sz = world.city.citySize()
        x = x.clamped(2, sz-2); z = z.clamped(2, sz-2)
        syncNode()
    }
}

private extension Float {
    func clamped(_ lo: Float, _ hi: Float) -> Float { max(lo, min(hi, self)) }
}
