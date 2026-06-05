package com.gtaclone.world

import android.graphics.Color
import com.gtaclone.engine.Camera3D
import com.gtaclone.entities.NPC3D
import com.gtaclone.entities.Player3D
import com.gtaclone.entities.Vehicle3D
import com.gtaclone.ui.VirtualJoystick

class World3D {
    val city   = City3D()
    val camera = Camera3D()
    val player = Player3D(city.citySize() / 2, city.citySize() / 2)
    val vehicles = mutableListOf<Vehicle3D>()
    val npcs     = mutableListOf<NPC3D>()

    init {
        camera.px = player.x; camera.pz = player.z
        spawnVehicles()
        spawnNPCs()
    }

    private fun spawnVehicles() {
        val half = city.citySize() / 2
        val spots = listOf(
            half - 15f to half, half + 15f to half,
            half to half - 20f, half to half + 20f,
            half - 30f to half - 30f, half + 30f to half - 30f,
            half - 30f to half + 30f, half + 30f to half + 30f,
            half + 50f to half, half - 50f to half
        )
        val colors = listOf(
            floatArrayOf(0.9f,0.1f,0.1f), floatArrayOf(0.1f,0.3f,0.9f),
            floatArrayOf(0.9f,0.8f,0.1f), floatArrayOf(0.9f,0.9f,0.9f),
            floatArrayOf(1.0f,0.4f,0.0f), floatArrayOf(0.5f,0.0f,0.8f),
            floatArrayOf(0.0f,0.7f,0.9f), floatArrayOf(0.9f,0.3f,0.3f),
            floatArrayOf(0.3f,0.9f,0.3f), floatArrayOf(0.9f,0.6f,0.0f)
        )
        spots.forEachIndexed { i, (x, z) ->
            val c = colors[i % colors.size]
            vehicles.add(Vehicle3D(x, z, c[0], c[1], c[2]))
        }
    }

    private fun spawnNPCs() {
        val half = city.citySize() / 2
        val colors = listOf(
            floatArrayOf(0.8f,0.2f,0.2f), floatArrayOf(0.2f,0.6f,0.8f),
            floatArrayOf(0.8f,0.5f,0.1f), floatArrayOf(0.5f,0.8f,0.2f)
        )
        for (i in 0 until 12) {
            val angle = i * 30.0
            val rad = Math.toRadians(angle)
            val r = 10f + (i % 3) * 12f
            val c = colors[i % colors.size]
            npcs.add(NPC3D(half + Math.cos(rad).toFloat() * r, half + Math.sin(rad).toFloat() * r, c[0], c[1], c[2]))
        }
    }

    fun update(dt: Float, joystick: VirtualJoystick) {
        player.update(dt, joystick, this)
        vehicles.forEach { it.update(dt, this) }
        npcs.forEach { it.update(dt, this) }
    }

    fun getNearestVehicle(x: Float, z: Float, radius: Float = 6f): Vehicle3D? =
        vehicles.filter { !it.isOccupied }
            .minByOrNull { it.distanceTo(x, z) }
            ?.takeIf { it.distanceTo(x, z) < radius }
}
