import UIKit
import SceneKit

class GameViewController: UIViewController, SCNSceneRendererDelegate {

    private var scnView: SCNView!
    private var hudView: HUDView!
    private var world: World3D!
    private var joystick: VirtualJoystick!
    private var input: InputManager!
    private var lastTime: TimeInterval = 0

    override func viewDidLoad() {
        super.viewDidLoad()

        world    = World3D()
        joystick = VirtualJoystick()
        input    = InputManager()

        // ── SceneKit view (full-screen 3D) ──────────────────────────────────
        scnView = SCNView(frame: view.bounds)
        scnView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        scnView.scene            = world.scene
        scnView.delegate         = self
        scnView.isPlaying        = true
        scnView.antialiasingMode = .multisampling4X
        scnView.showsStatistics  = false
        scnView.backgroundColor  = UIColor(red: 0.53, green: 0.81, blue: 0.98, alpha: 1)
        view.addSubview(scnView)

        // ── HUD overlay (Canvas-style UIView) ────────────────────────────────
        hudView = HUDView(frame: view.bounds, world: world, joystick: joystick)
        hudView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(hudView)
    }

    // Called on the SceneKit render thread (~60 fps)
    func renderer(_ renderer: SCNSceneRenderer, updateAtTime time: TimeInterval) {
        let dt = Float(lastTime == 0 ? 0.016 : min(time - lastTime, 0.05))
        lastTime = time
        world.update(dt: dt, joystick: joystick)
        DispatchQueue.main.async { self.hudView.setNeedsDisplay() }
    }

    // ── Touch forwarding ─────────────────────────────────────────────────────
    override func touchesBegan(_ t: Set<UITouch>, with e: UIEvent?) {
        input.began(t, world: world, joystick: joystick, bounds: view.bounds)
    }
    override func touchesMoved(_ t: Set<UITouch>, with e: UIEvent?) {
        input.moved(t, world: world, joystick: joystick)
    }
    override func touchesEnded(_ t: Set<UITouch>, with e: UIEvent?) {
        input.ended(t, joystick: joystick)
    }
    override func touchesCancelled(_ t: Set<UITouch>, with e: UIEvent?) {
        input.ended(t, joystick: joystick)
    }

    override var prefersStatusBarHidden: Bool { true }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .landscape }
}
