import SceneKit

class Player3D: Entity3D {

    var money        = 500
    var wantedLevel  = 0
    var wantedTimer: Float = 0
    var sprinting    = false
    var isInVehicle  = false
    var currentVehicle: Vehicle3D?

    private let walkSpeed:  Float = 7
    private let sprintSpeed: Float = 13

    init(x: Float, z: Float) {
        super.init(x: x, z: z)
        buildVisual()
    }

    private func buildVisual() {
        let skin = UIColor(red: 0.9,  green: 0.72, blue: 0.56, alpha: 1)
        let blue = UIColor(red: 0.12, green: 0.38, blue: 0.72, alpha: 1)
        let dark = UIColor(red: 0.28, green: 0.18, blue: 0.09, alpha: 1)

        let legs = SCNBox(width: 0.4, height: 1.0, length: 0.4, chamferRadius: 0.04)
        legs.firstMaterial?.diffuse.contents = dark
        let ln = SCNNode(geometry: legs); ln.position = SCNVector3(0, 0.5, 0)
        node.addChildNode(ln)

        let body = SCNBox(width: 0.75, height: 0.9, length: 0.45, chamferRadius: 0.05)
        body.firstMaterial?.diffuse.contents = blue
        let bn = SCNNode(geometry: body); bn.position = SCNVector3(0, 1.35, 0)
        node.addChildNode(bn)

        let head = SCNSphere(radius: 0.30)
        head.firstMaterial?.diffuse.contents = skin
        let hn = SCNNode(geometry: head); hn.position = SCNVector3(0, 2.1, 0)
        node.addChildNode(hn)

        // Direction dot (green sphere on top of head)
        let dot = SCNSphere(radius: 0.08)
        dot.firstMaterial?.diffuse.contents = UIColor.green
        dot.firstMaterial?.emission.contents = UIColor.green
        let dn = SCNNode(geometry: dot); dn.position = SCNVector3(0, 2.55, 0)
        node.addChildNode(dn)
    }

    func update(dt: Float, joystick: VirtualJoystick, world: World3D) {
        if isInVehicle { driveVehicle(dt: dt, joystick: joystick, world: world); return }

        let dx = joystick.dirX; let dz = joystick.dirY
        if dx != 0 || dz != 0 {
            rotY = atan2(dx, dz) * 180 / .pi
            let spd = sprinting ? sprintSpeed : walkSpeed
            let nx = x + dx * spd * dt; let nz = z + dz * spd * dt
            if !world.city.isBlocked(x: nx, z: z) { x = nx }
            if !world.city.isBlocked(x: x,  z: nz) { z = nz }
        }

        let sz = world.city.citySize()
        x = max(1, min(sz-1, x)); z = max(1, min(sz-1, z))

        world.camera.update(playerPos: SCNVector3(x, y, z), playerYaw: rotY)
        node.isHidden = false
        syncNode()
        decreaseWanted(dt: dt)
    }

    private func driveVehicle(dt: Float, joystick: VirtualJoystick, world: World3D) {
        guard let car = currentVehicle else { return }
        let dx = joystick.dirX; let dz = joystick.dirY
        if dx != 0 || dz != 0 {
            car.rotY = atan2(dx, dz) * 180 / .pi
            let spd = sprinting ? car.maxSpeed * 1.5 : car.maxSpeed
            car.vx = sin(car.rotY * .pi / 180) * spd
            car.vz = cos(car.rotY * .pi / 180) * spd
        } else { car.vx *= 0.88; car.vz *= 0.88 }

        let nx = car.x + car.vx * dt; let nz = car.z + car.vz * dt
        if !world.city.isBlocked(x: nx, z: car.z, radius: 1.5) { car.x = nx }
        if !world.city.isBlocked(x: car.x, z: nz,  radius: 1.5) { car.z = nz }
        car.syncNode()

        x = car.x; z = car.z; rotY = car.rotY
        world.camera.update(playerPos: SCNVector3(x, car.y + 0.5, z), playerYaw: rotY)
        decreaseWanted(dt: dt)
    }

    func tryEnterExitVehicle(world: World3D) {
        if isInVehicle {
            currentVehicle?.isOccupied = false; currentVehicle = nil
            isInVehicle = false; node.isHidden = false
        } else if let car = world.nearestFreeVehicle(x: x, z: z) {
            car.isOccupied = true; currentVehicle = car
            isInVehicle = true; node.isHidden = true
            x = car.x; z = car.z
        }
    }

    func attack(world: World3D) {
        for npc in world.npcs where npc.health > 0 && distanceTo(npc) < 4 {
            npc.health -= 30; money += 10
            wantedLevel = min(wantedLevel + 1, 5); wantedTimer = 0
        }
    }

    private func decreaseWanted(dt: Float) {
        guard wantedLevel > 0 else { return }
        wantedTimer += dt
        if wantedTimer > 10 { wantedLevel -= 1; wantedTimer = 0 }
    }
}
