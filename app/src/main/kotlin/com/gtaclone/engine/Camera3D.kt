package com.gtaclone.engine

import android.opengl.Matrix
import kotlin.math.cos
import kotlin.math.sin

class Camera3D {
    var px = 0f; var py = 0f; var pz = 0f
    var yaw = 0f  // player facing, degrees

    private val followDist = 9f
    private val followHeight = 5.5f

    // Optional: allow user to orbit camera around player via touch drag
    var orbitOffset = 0f  // extra yaw offset for orbit, degrees

    fun getViewMatrix(out: FloatArray) {
        val totalYaw = yaw + orbitOffset
        val rad = Math.toRadians(totalYaw.toDouble())
        val camX = px - sin(rad).toFloat() * followDist
        val camY = py + followHeight
        val camZ = pz - cos(rad).toFloat() * followDist
        Matrix.setLookAtM(out, 0,
            camX, camY, camZ,
            px, py + 1.5f, pz,
            0f, 1f, 0f)
    }
}
