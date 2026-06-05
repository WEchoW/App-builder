import SceneKit

class Camera3D {

    let node: SCNNode

    private let followDist: Float  = 9
    private let followHeight: Float = 5.5
    var orbitOffset: Float = 0

    init() {
        node = SCNNode()
        let cam      = SCNCamera()
        cam.fieldOfView = 60
        cam.zNear    = 0.2
        cam.zFar     = 600
        node.camera  = cam
    }

    func update(playerPos: SCNVector3, playerYaw: Float) {
        let yaw = (playerYaw + orbitOffset) * .pi / 180
        node.position = SCNVector3(
            playerPos.x - sin(yaw) * followDist,
            playerPos.y + followHeight,
            playerPos.z - cos(yaw) * followDist
        )
        node.look(at: SCNVector3(playerPos.x, playerPos.y + 1.5, playerPos.z))
    }
}
