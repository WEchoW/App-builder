import UIKit

class InputManager {

    private weak var joystickTouch: UITouch?
    private weak var orbitTouch: UITouch?
    private var lastOrbitX: CGFloat = 0

    func began(_ touches: Set<UITouch>, world: World3D, joystick: VirtualJoystick, bounds: CGRect) {
        for t in touches {
            let p = t.location(in: nil)
            if joystick.contains(p) && joystickTouch == nil {
                joystickTouch = t; joystick.onTouchDown(p)
            } else if p.x > bounds.width * 0.55 {
                handleButton(p, bounds: bounds, world: world)
                if orbitTouch == nil { orbitTouch = t; lastOrbitX = p.x }
            }
        }
    }

    func moved(_ touches: Set<UITouch>, world: World3D, joystick: VirtualJoystick) {
        for t in touches {
            let p = t.location(in: nil)
            if t === joystickTouch { joystick.onTouchMove(p) }
            if t === orbitTouch {
                world.camera.orbitOffset += Float(p.x - lastOrbitX) * 0.3
                lastOrbitX = p.x
            }
        }
    }

    func ended(_ touches: Set<UITouch>, joystick: VirtualJoystick) {
        for t in touches {
            if t === joystickTouch { joystickTouch = nil; joystick.onTouchUp() }
            if t === orbitTouch    { orbitTouch = nil }
        }
    }

    private func handleButton(_ p: CGPoint, bounds: CGRect, world: World3D) {
        let bs = bounds.height * 0.11
        let mg: CGFloat = 20
        let rx = bounds.width  - mg - bs
        let by = bounds.height - mg - bs

        if p.x >= rx - bs*1.3 && p.x <= rx - bs*0.3 && p.y >= by - bs*1.3 && p.y <= by - bs*0.3 {
            world.player.tryEnterExitVehicle(world: world)
        }
        if p.x >= rx && p.x <= rx+bs && p.y >= by && p.y <= by+bs {
            world.player.attack(world: world)
        }
        if p.x >= rx && p.x <= rx+bs && p.y >= by-bs*1.3 && p.y <= by-bs*0.3 {
            world.player.sprinting.toggle()
        }
    }
}
