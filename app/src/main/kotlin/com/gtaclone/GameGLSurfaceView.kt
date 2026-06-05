package com.gtaclone

import android.content.Context
import android.opengl.GLSurfaceView
import com.gtaclone.renderer.GameRenderer
import com.gtaclone.ui.VirtualJoystick
import com.gtaclone.world.World3D

class GameGLSurfaceView(context: Context, world: World3D, joystick: VirtualJoystick) : GLSurfaceView(context) {

    init {
        setEGLContextClientVersion(2)
        setRenderer(GameRenderer(world, joystick))
        renderMode = RENDERMODE_CONTINUOUSLY
    }
}
