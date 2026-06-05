package com.gtaclone.engine

import android.view.MotionEvent
import com.gtaclone.ui.VirtualJoystick
import com.gtaclone.world.World

class InputManager {

    var joystickPointerId = -1

    fun handleTouch(event: MotionEvent, joystick: VirtualJoystick, world: World, screenW: Float, screenH: Float) {
        val actionIndex = event.actionIndex
        val pointerId = event.getPointerId(actionIndex)
        val x = event.getX(actionIndex)
        val y = event.getY(actionIndex)

        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN, MotionEvent.ACTION_POINTER_DOWN -> {
                if (joystick.contains(x, y) && joystickPointerId == -1) {
                    joystickPointerId = pointerId
                    joystick.onTouchDown(x, y)
                } else {
                    handleButton(x, y, screenW, screenH, world)
                }
            }
            MotionEvent.ACTION_MOVE -> {
                for (i in 0 until event.pointerCount) {
                    if (event.getPointerId(i) == joystickPointerId) {
                        joystick.onTouchMove(event.getX(i), event.getY(i))
                    }
                }
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_POINTER_UP -> {
                if (pointerId == joystickPointerId) {
                    joystickPointerId = -1
                    joystick.onTouchUp()
                }
            }
        }
    }

    private fun handleButton(x: Float, y: Float, screenW: Float, screenH: Float, world: World) {
        val btnSize = screenH * 0.11f
        val margin = 20f
        val rightX = screenW - margin - btnSize
        val bottomY = screenH - margin - btnSize

        // Car button (enter/exit vehicle)
        if (x >= rightX - btnSize * 1.3f && x <= rightX - btnSize * 0.3f &&
            y >= bottomY - btnSize * 1.3f && y <= bottomY - btnSize * 0.3f) {
            world.player.tryEnterExitVehicle(world)
            return
        }
        // Attack button
        if (x >= rightX && x <= rightX + btnSize && y >= bottomY && y <= bottomY + btnSize) {
            world.player.attack(world)
            return
        }
        // Sprint toggle
        if (x >= rightX && x <= rightX + btnSize &&
            y >= bottomY - btnSize * 1.3f && y <= bottomY - btnSize * 0.3f) {
            world.player.sprinting = !world.player.sprinting
        }
    }
}
