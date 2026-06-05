package com.gtaclone.entities

abstract class Entity3D(var x: Float, var y: Float, var z: Float) {
    var rotY = 0f
    var health = 100f
    var vx = 0f; var vz = 0f

    abstract val w: Float; abstract val h: Float; abstract val d: Float
    abstract fun color(): FloatArray

    fun distanceTo(o: Entity3D) = kotlin.math.hypot(x - o.x, z - o.z)
    fun distanceTo(ox: Float, oz: Float) = kotlin.math.hypot(x - ox, z - oz)
}
