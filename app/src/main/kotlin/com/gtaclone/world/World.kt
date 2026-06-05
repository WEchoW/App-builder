package com.gtaclone.world

import android.graphics.Canvas
import android.graphics.Color
import com.gtaclone.engine.Camera
import com.gtaclone.entities.NPC
import com.gtaclone.entities.Player
import com.gtaclone.entities.Vehicle
import com.gtaclone.ui.VirtualJoystick

class World {

    val tileMap = TileMap()
    val player = Player(320f, 320f)
    val vehicles = mutableListOf<Vehicle>()
    val npcs = mutableListOf<NPC>()

    init {
        spawnVehicles()
        spawnNPCs()
    }

    private fun spawnVehicles() {
        val spots = listOf(
            640f to 64f, 960f to 64f, 1280f to 64f,
            64f to 640f, 64f to 960f,
            640f to 640f, 960f to 320f, 1280f to 640f,
            320f to 960f, 960f to 960f
        )
        val colors = listOf(
            Color.RED, Color.BLUE, Color.YELLOW,
            Color.WHITE, Color.parseColor("#FF6600"),
            Color.parseColor("#AA00FF"), Color.CYAN,
            Color.parseColor("#FF4444"), Color.parseColor("#44FF44"),
            Color.parseColor("#FFCC00")
        )
        spots.forEachIndexed { i, (x, y) ->
            vehicles.add(Vehicle(x, y, colors[i % colors.size]))
        }
    }

    private fun spawnNPCs() {
        val spots = listOf(
            420f to 220f, 520f to 420f, 700f to 320f, 820f to 520f,
            320f to 620f, 920f to 220f, 620f to 720f, 1020f to 420f,
            220f to 820f, 1120f to 620f, 420f to 920f, 720f to 820f
        )
        spots.forEach { (x, y) -> npcs.add(NPC(x, y)) }
    }

    fun update(deltaTime: Float, joystick: VirtualJoystick) {
        player.update(deltaTime, joystick, this)
        vehicles.forEach { it.update(deltaTime) }
        npcs.forEach { it.update(deltaTime, this) }
    }

    fun draw(canvas: Canvas, camera: Camera) {
        tileMap.draw(canvas, camera)
        vehicles.filter { camera.isVisible(it.x, it.y) }.forEach { it.draw(canvas) }
        npcs.filter { camera.isVisible(it.x, it.y) }.forEach { it.draw(canvas) }
        player.draw(canvas)
    }

    fun getNearestVehicle(x: Float, y: Float, radius: Float = 90f): Vehicle? =
        vehicles.filter { !it.isOccupied }
            .minByOrNull { it.distanceTo(player) }
            ?.takeIf { it.distanceTo(player) < radius }
}
