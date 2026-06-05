import SceneKit

class Entity3D {
    var x: Float; var y: Float = 0; var z: Float
    var rotY: Float = 0
    var health: Float = 100
    let node: SCNNode

    init(x: Float, z: Float) {
        self.x = x; self.z = z
        node = SCNNode()
    }

    func syncNode() {
        node.position   = SCNVector3(x, y, z)
        node.eulerAngles.y = rotY * .pi / 180
    }

    func distanceTo(_ o: Entity3D) -> Float { hypot(x - o.x, z - o.z) }
    func distanceTo(x ox: Float, z oz: Float) -> Float { hypot(x - ox, z - oz) }
}
