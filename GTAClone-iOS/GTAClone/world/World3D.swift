import SceneKit

class World3D {

    let scene  = SCNScene()
    let city   = City3D()
    let camera = Camera3D()
    let player: Player3D
    var vehicles: [Vehicle3D] = []
    var npcs:     [NPC3D]     = []

    init() {
        // City geometry
        city.build(into: scene)

        let half = city.citySize() / 2
        player = Player3D(x: half, z: half)

        // Lighting
        let sun = SCNLight(); sun.type = .directional
        sun.color = UIColor(red: 1, green: 0.97, blue: 0.90, alpha: 1)
        sun.intensity = 900; sun.castsShadow = true
        sun.shadowMapSize = CGSize(width: 2048, height: 2048)
        let sunNode = SCNNode(); sunNode.light = sun
        sunNode.eulerAngles = SCNVector3(-0.8, 0.5, 0)
        scene.rootNode.addChildNode(sunNode)

        let ambient = SCNLight(); ambient.type = .ambient
        ambient.color = UIColor(red: 0.30, green: 0.33, blue: 0.38, alpha: 1)
        ambient.intensity = 400
        let ambNode = SCNNode(); ambNode.light = ambient
        scene.rootNode.addChildNode(ambNode)

        // Camera
        camera.update(playerPos: SCNVector3(half, 0, half), playerYaw: 0)
        scene.rootNode.addChildNode(camera.node)

        // Spawn vehicles + NPCs
        spawnVehicles()
        spawnNPCs()

        // Player node
        scene.rootNode.addChildNode(player.node)
    }

    private func spawnVehicles() {
        let h = city.citySize() / 2
        let specs: [(Float, Float, UIColor)] = [
            (h-15, h,    .red),
            (h+15, h,    UIColor(red:0.1, green:0.3, blue:0.9, alpha:1)),
            (h,    h-20, .yellow),
            (h,    h+20, .white),
            (h-30, h-30, UIColor(red:1.0, green:0.4, blue:0, alpha:1)),
            (h+30, h-30, UIColor(red:0.5, green:0, blue:0.8, alpha:1)),
            (h-30, h+30, UIColor(red:0, green:0.7, blue:0.9, alpha:1)),
            (h+30, h+30, UIColor(red:0.9, green:0.6, blue:0, alpha:1)),
            (h+50, h,    UIColor(red:0.3, green:0.9, blue:0.3, alpha:1)),
            (h-50, h,    UIColor(red:0.9, green:0.3, blue:0.3, alpha:1)),
        ]
        for (x, z, col) in specs {
            let v = Vehicle3D(x: x, z: z, color: col)
            vehicles.append(v)
            scene.rootNode.addChildNode(v.node)
        }
    }

    private func spawnNPCs() {
        let h = city.citySize() / 2
        let colors: [UIColor] = [.red, UIColor(red:0.2,green:0.6,blue:0.8,alpha:1),
                                  .orange, UIColor(red:0.5,green:0.8,blue:0.2,alpha:1)]
        for i in 0..<12 {
            let a = Float(i) * 30 * .pi / 180
            let r: Float = 10 + Float(i % 3) * 12
            let npc = NPC3D(x: h + cos(a)*r, z: h + sin(a)*r, shirtColor: colors[i % colors.count])
            npcs.append(npc)
            scene.rootNode.addChildNode(npc.node)
        }
    }

    func update(dt: Float, joystick: VirtualJoystick) {
        player.update(dt: dt, joystick: joystick, world: self)
        vehicles.forEach { $0.update(dt: dt, city: city) }
        npcs.forEach     { $0.update(dt: dt, world: self) }
    }

    func nearestFreeVehicle(x: Float, z: Float, radius: Float = 6) -> Vehicle3D? {
        vehicles.filter { !$0.isOccupied }
            .min { $0.distanceTo(x: x, z: z) < $1.distanceTo(x: x, z: z) }
            .flatMap { $0.distanceTo(x: x, z: z) < radius ? $0 : nil }
    }
}
