package com.gtaclone.engine

import android.view.MotionEvent
import com.gtaclone.ui.VirtualJoystick
import com.gtaclone.world.World3D

class InputManager {

    private var joystickPid = -1
    private var orbitPid = -1
    private var lastOrbitX = 0f

    fun handleTouch(ev: MotionEvent, joystick: VirtualJoystick, world: World3D, sw: Float, sh: Float) {
        val ai = ev.actionIndex
        val pid = ev.getPointerId(ai)
        val x = ev.getX(ai); val y = ev.getY(ai)

        when (ev.actionMasked) {
            MotionEvent.ACTION_DOWN, MotionEvent.ACTION_POINTER_DOWN -> {
                if (joystick.contains(x, y) && joystickPid == -1) {
                    joystickPid = pid; joystick.onTouchDown(x, y)
                } else if (x > sw * 0.55f) {
                    checkButtons(x, y, sw, sh, world)
                    if (orbitPid == -1) { orbitPid = pid; lastOrbitX = x }
                }
            }
            MotionEvent.ACTION_MOVE -> {
                for (i in 0 until ev.pointerCount) {
                    val p = ev.getPointerId(i)
                    if (p == joystickPid) joystick.onTouchMove(ev.getX(i), ev.getY(i))
                    if (p == orbitPid) {
                        val dx = ev.getX(i) - lastOrbitX
                        world.camera.orbitOffset += dx * 0.3f
                        lastOrbitX = ev.getX(i)
                    }
                }
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_POINTER_UP -> {
                if (pid == joystickPid) { joystickPid = -1; joystick.onTouchUp() }
                if (pid == orbitPid) orbitPid = -1
            }
        }
    }

    private fun checkButtons(x: Float, y: Float, sw: Float, sh: Float, world: World3D) {
        val bs = sh * 0.11f
        val mg = 20f
        val rx = sw - mg - bs; val by = sh - mg - bs

        // CAR button
        if (x in (rx - bs * 1.3f)..(rx - bs * 0.3f) && y in (by - bs * 1.3f)..(by - bs * 0.3f))
            world.player.tryEnterExitVehicle(world)
        // ATK button
        if (x in rx..(rx + bs) && y in by..(by + bs))
            world.player.attack(world)
        // RUN toggle
        if (x in rx..(rx + bs) && y in (by - bs * 1.3f)..(by - bs * 0.3f))
            world.player.sprinting = !world.player.sprinting
    }
}
