package com.gtaclone.entities

import com.gtaclone.world.World3D
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.sin
import kotlin.random.Random

class NPC3D(x: Float, z: Float, r: Float, g: Float, b: Float) : Entity3D(x, 0f, z) {
    override val w = 0.6f; override val h = 1.7f; override val d = 0.6f
    private val cr = r; private val cg = g; private val cb = b

    private var targetX = x; private var targetZ = z
    private var thinkTimer = Random.nextFloat() * 2f
    private var fleeing = false

    override fun color() = floatArrayOf(cr, cg, cb)

    fun update(dt: Float, world: World3D) {
        if (health <= 0f) return
        val player = world.player
        val dist = distanceTo(player)

        if (player.wantedLevel > 0 && dist < 25f) {
            fleeing = true
            val a = atan2(z - player.z, x - player.x)
            targetX = x + cos(a) * 20f; targetZ = z + sin(a) * 20f
        } else {
            fleeing = false
            thinkTimer -= dt
            if (thinkTimer <= 0f) {
                targetX = x + Random.nextFloat() * 20f - 10f
                targetZ = z + Random.nextFloat() * 20f - 10f
                thinkTimer = Random.nextFloat() * 3f + 1.5f
            }
        }

        val dx = targetX - x; val dz = targetZ - z
        val d = hypot(dx, dz)
        if (d > 0.5f) {
            val speed = if (fleeing) 6f else 2.5f
            rotY = Math.toDegrees(atan2(dx.toDouble(), dz.toDouble())).toFloat()
            val nx = x + (dx / d) * speed * dt
            val nz = z + (dz / d) * speed * dt
            if (!world.city.isBlocked(nx, z)) x = nx
            if (!world.city.isBlocked(x, nz)) z = nz
        }

        val size = world.city.citySize()
        x = x.coerceIn(2f, size - 2f); z = z.coerceIn(2f, size - 2f)
    }
}
