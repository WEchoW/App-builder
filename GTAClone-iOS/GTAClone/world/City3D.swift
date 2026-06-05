import SceneKit

// Simple deterministic LCG so the city looks the same every run
private class RNG {
    private var s: UInt64 = 42
    func next() -> Float {
        s = s &* 6364136223846793005 &+ 1442695040888963407
        return Float((s >> 33) & 0xFFFF) / 65535.0
    }
    func range(_ lo: Float, _ hi: Float) -> Float { lo + next() * (hi - lo) }
    func int(_ n: Int) -> Int { Int(next() * Float(n)) }
}

struct Collider { let minX, minZ, maxX, maxZ: Float }

class City3D {

    let BLOCK: Float = 40; let ROAD: Float = 10; let GRID = 10
    private(set) var colliders: [Collider] = []

    func build(into scene: SCNScene) {
        let rng = RNG()
        let total = Float(GRID) * (BLOCK + ROAD)

        // Ground (SCNFloor = infinite reflective plane at y=0)
        let floor = SCNFloor()
        floor.reflectivity = 0
        floor.firstMaterial?.diffuse.contents = UIColor(r: 0.24, g: 0.42, b: 0.16)
        scene.rootNode.addChildNode(SCNNode(geometry: floor))

        // Road grid (flat slabs, y = 0.02)
        let roadMat = SCNMaterial(); roadMat.diffuse.contents = UIColor(r: 0.27, g: 0.27, b: 0.27)
        for n in 0..<(GRID - 1) {
            let rc = Float(n) * (BLOCK + ROAD) + BLOCK + ROAD / 2
            addSlab(scene: scene, cx: total/2, cz: rc, w: total, d: ROAD, mat: roadMat)
            addSlab(scene: scene, cx: rc, cz: total/2, w: ROAD, d: total, mat: roadMat)
        }

        // Yellow centre-line stripes (very thin, raised slightly above road)
        let lineMat = SCNMaterial(); lineMat.diffuse.contents = UIColor(r: 0.9, g: 0.85, b: 0.1)
        for n in 0..<(GRID - 1) {
            let rc = Float(n) * (BLOCK + ROAD) + BLOCK + ROAD / 2
            addSlab(scene: scene, cx: total/2, cz: rc, w: total, d: 0.25, mat: lineMat, y: 0.06)
            addSlab(scene: scene, cx: rc, cz: total/2, w: 0.25, d: total, mat: lineMat, y: 0.06)
        }

        // Buildings
        let palette: [UIColor] = [
            UIColor(r:0.48,g:0.38,b:0.22), UIColor(r:0.30,g:0.44,b:0.55),
            UIColor(r:0.55,g:0.30,b:0.30), UIColor(r:0.42,g:0.42,b:0.44),
            UIColor(r:0.35,g:0.50,b:0.34)
        ]
        for bx in 0..<GRID {
            for bz in 0..<GRID {
                let x0 = Float(bx) * (BLOCK + ROAD); let z0 = Float(bz) * (BLOCK + ROAD)
                if bx >= 4 && bx <= 5 && bz >= 4 && bz <= 5 { addPark(scene: scene, x0: x0, z0: z0); continue }

                let margin: Float = 4; let avail = BLOCK - margin * 2
                let bw = rng.range(avail * 0.35, avail * 0.90)
                let bd = rng.range(avail * 0.35, avail * 0.90)
                let bh = rng.range(5, 43)
                let ox = margin + rng.range(0, avail - bw)
                let oz = margin + rng.range(0, avail - bd)
                let col = palette[(bx + bz + rng.int(3)) % palette.count]
                addBuilding(scene: scene, cx: x0+ox+bw/2, h: bh, cz: z0+oz+bd/2, w: bw, d: bd, color: col)
                colliders.append(Collider(minX: x0+ox, minZ: z0+oz, maxX: x0+ox+bw, maxZ: z0+oz+bd))
            }
        }
    }

    private func addSlab(scene: SCNScene, cx: Float, cz: Float, w: Float, d: Float, mat: SCNMaterial, y: Float = 0.02) {
        let geo = SCNBox(width: CGFloat(w), height: 0.04, length: CGFloat(d), chamferRadius: 0)
        geo.firstMaterial = mat
        let n = SCNNode(geometry: geo); n.position = SCNVector3(cx, y, cz)
        scene.rootNode.addChildNode(n)
    }

    private func addBuilding(scene: SCNScene, cx: Float, h: Float, cz: Float, w: Float, d: Float, color: UIColor) {
        let geo = SCNBox(width: CGFloat(w), height: CGFloat(h), length: CGFloat(d), chamferRadius: 0.12)
        geo.firstMaterial?.diffuse.contents = color
        let n = SCNNode(geometry: geo); n.position = SCNVector3(cx, h/2, cz)
        scene.rootNode.addChildNode(n)

        // Window rows every 3 m
        let winMat = SCNMaterial(); winMat.diffuse.contents = UIColor(r: 0.85, g: 0.92, b: 0.72)
        winMat.emission.contents = UIColor(r: 0.3, g: 0.35, b: 0.1)
        var floor: Float = 3
        while floor < h - 1 {
            let wy = -(h/2) + floor
            let fGeo = SCNBox(width: CGFloat(w*0.62), height: 0.8, length: 0.06, chamferRadius: 0)
            fGeo.firstMaterial = winMat
            let fn = SCNNode(geometry: fGeo); fn.position = SCNVector3(0, wy, d/2 + 0.04)
            n.addChildNode(fn)
            floor += 3
        }
    }

    private func addPark(scene: SCNScene, x0: Float, z0: Float) {
        let treePos: [(Float, Float)] = [(8,8),(30,8),(8,30),(30,30),(19,19)]
        for (tx, tz) in treePos {
            let trunk = SCNBox(width: 1, height: 3, length: 1, chamferRadius: 0.1)
            trunk.firstMaterial?.diffuse.contents = UIColor(r: 0.36, g: 0.22, b: 0.10)
            let tn = SCNNode(geometry: trunk); tn.position = SCNVector3(x0+tx, 1.5, z0+tz)
            scene.rootNode.addChildNode(tn)
            let canopy = SCNSphere(radius: 3)
            canopy.firstMaterial?.diffuse.contents = UIColor(r: 0.20, g: 0.60, b: 0.20)
            let cn = SCNNode(geometry: canopy); cn.position = SCNVector3(x0+tx, 5.5, z0+tz)
            scene.rootNode.addChildNode(cn)
        }
    }

    func isBlocked(x: Float, z: Float, radius: Float = 0.9) -> Bool {
        colliders.contains { c in x+radius > c.minX && x-radius < c.maxX && z+radius > c.minZ && z-radius < c.maxZ }
    }

    func citySize() -> Float { Float(GRID) * (BLOCK + ROAD) }
}

private extension UIColor {
    convenience init(r: CGFloat, g: CGFloat, b: CGFloat) { self.init(red: r, green: g, blue: b, alpha: 1) }
}
