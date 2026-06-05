package com.gtaclone.entities

import com.gtaclone.world.World3D

class Vehicle3D(x: Float, z: Float, private val cr: Float, private val cg: Float, private val cb: Float) : Entity3D(x, 0f, z) {
    override val w = 2.2f; override val h = 1.4f; override val d = 4.5f
    var maxSpeed = 18f
    var isOccupied = false

    override fun color() = floatArrayOf(cr, cg, cb)

    fun update(dt: Float, world: World3D) {
        if (isOccupied) return
        vx *= 0.85f; vz *= 0.85f
    }

    // Windshield box dimensions for rendering accent
    val windshieldW get() = w * 0.85f
    val windshieldH get() = 0.6f
    val windshieldD get() = 0.1f
}
