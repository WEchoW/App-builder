import SceneKit

class Vehicle3D: Entity3D {
    let maxSpeed: Float = 18
    var isOccupied = false

    init(x: Float, z: Float, color: UIColor) {
        super.init(x: x, z: z)
        buildVisual(color: color)
    }

    private func buildVisual(color: UIColor) {
        // Body
        let body = SCNBox(width: 2.2, height: 0.9, length: 4.5, chamferRadius: 0.15)
        body.firstMaterial?.diffuse.contents = color
        node.addChildNode(SCNNode(geometry: body))

        // Cabin
        let cabin = SCNBox(width: 1.8, height: 0.75, length: 2.5, chamferRadius: 0.12)
        cabin.firstMaterial?.diffuse.contents = lighter(color)
        let cn = SCNNode(geometry: cabin); cn.position = SCNVector3(0, 0.82, -0.3)
        node.addChildNode(cn)

        // Windshield
        let ws = SCNBox(width: 1.7, height: 0.55, length: 0.06, chamferRadius: 0)
        ws.firstMaterial?.diffuse.contents = UIColor(red: 0.6, green: 0.85, blue: 1, alpha: 0.7)
        let wn = SCNNode(geometry: ws); wn.position = SCNVector3(0, 0.82, -1.56)
        node.addChildNode(wn)

        // Headlights
        let hl = SCNBox(width: 0.5, height: 0.2, length: 0.06, chamferRadius: 0)
        hl.firstMaterial?.diffuse.contents = UIColor.yellow
        hl.firstMaterial?.emission.contents = UIColor(red: 1, green: 0.9, blue: 0.5, alpha: 1)
        for side: Float in [-0.75, 0.75] {
            let hn = SCNNode(geometry: hl); hn.position = SCNVector3(side, 0, -2.28)
            node.addChildNode(hn)
        }

        // Taillights
        let tl = SCNBox(width: 0.5, height: 0.2, length: 0.06, chamferRadius: 0)
        tl.firstMaterial?.diffuse.contents = UIColor.red
        for side: Float in [-0.75, 0.75] {
            let tn = SCNNode(geometry: tl); tn.position = SCNVector3(side, 0, 2.28)
            node.addChildNode(tn)
        }

        // Wheels (4 dark cylinders)
        for wx: Float in [-1.2, 1.2] {
            for wz: Float in [-1.4, 1.4] {
                let wh = SCNCylinder(radius: 0.38, height: 0.28)
                wh.firstMaterial?.diffuse.contents = UIColor(red: 0.15, green: 0.15, blue: 0.15, alpha: 1)
                let wn = SCNNode(geometry: wh)
                wn.position = SCNVector3(wx, -0.42, wz)
                wn.eulerAngles.z = .pi / 2
                node.addChildNode(wn)
            }
        }

        y = 0.5  // lift so wheels touch ground
    }

    func update(dt: Float, city: City3D) {
        if isOccupied { return }
        vx *= 0.85; vz *= 0.85
    }

    private func lighter(_ c: UIColor) -> UIColor {
        var r: CGFloat = 0; var g: CGFloat = 0; var b: CGFloat = 0; var a: CGFloat = 0
        c.getRed(&r, green: &g, blue: &b, alpha: &a)
        return UIColor(red: min(r+0.18,1), green: min(g+0.18,1), blue: min(b+0.18,1), alpha: a)
    }
}
