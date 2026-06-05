package com.gtaclone.entities

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import com.gtaclone.ui.VirtualJoystick
import com.gtaclone.world.World
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin

class Player(x: Float, y: Float) : Entity(x, y) {

    var money = 500
    var wantedLevel = 0
    var wantedTimer = 0f
    var sprinting = false
    var isInVehicle = false
    var currentVehicle: Vehicle? = null

    private val walkSpeed = 180f
    private val sprintSpeed = 310f

    private val headPaint = Paint().apply { color = Color.parseColor("#FFCC99"); isAntiAlias = true }
    private val shadowPaint = Paint().apply { color = Color.parseColor("#44000000"); isAntiAlias = true }
    private val indicatorPaint = Paint().apply { color = Color.GREEN; isAntiAlias = true }

    fun update(deltaTime: Float, joystick: VirtualJoystick, world: World) {
        if (isInVehicle) {
            currentVehicle?.let { car ->
                val dx = joystick.dirX; val dy = joystick.dirY
                if (dx != 0f || dy != 0f) {
                    car.rotation = Math.toDegrees(atan2(dy.toDouble(), dx.toDouble())).toFloat()
                    val speed = if (sprinting) car.maxSpeed * 1.5f else car.maxSpeed
                    val rad = Math.toRadians(car.rotation.toDouble())
                    car.vx = cos(rad).toFloat() * speed
                    car.vy = sin(rad).toFloat() * speed
                } else {
                    car.vx *= 0.88f; car.vy *= 0.88f
                }
                val nx = car.x + car.vx * deltaTime
                val ny = car.y + car.vy * deltaTime
                if (world.tileMap.isWalkable(nx, ny)) { car.x = nx; car.y = ny }
                else { car.vx = 0f; car.vy = 0f }
                x = car.x; y = car.y; rotation = car.rotation
            }
            decreaseWanted(deltaTime)
            return
        }

        val dx = joystick.dirX; val dy = joystick.dirY
        if (dx != 0f || dy != 0f) {
            rotation = Math.toDegrees(atan2(dy.toDouble(), dx.toDouble())).toFloat()
            val speed = if (sprinting) sprintSpeed else walkSpeed
            val nx = x + dx * speed * deltaTime
            val ny = y + dy * speed * deltaTime
            if (world.tileMap.isWalkable(nx, y)) x = nx
            if (world.tileMap.isWalkable(x, ny)) y = ny
        }

        x = x.coerceIn(16f, world.tileMap.worldWidth() - 16f)
        y = y.coerceIn(16f, world.tileMap.worldHeight() - 16f)
        decreaseWanted(deltaTime)
    }

    private fun decreaseWanted(dt: Float) {
        if (wantedLevel > 0) {
            wantedTimer += dt
            if (wantedTimer > 10f) { wantedLevel--; wantedTimer = 0f }
        }
    }

    fun tryEnterExitVehicle(world: World) {
        if (isInVehicle) {
            currentVehicle?.isOccupied = false
            currentVehicle = null
            isInVehicle = false
        } else {
            world.getNearestVehicle(x, y)?.let { car ->
                car.isOccupied = true
                currentVehicle = car
                isInVehicle = true
                x = car.x; y = car.y
            }
        }
    }

    fun attack(world: World) {
        world.npcs.filter { it.health > 0f && distanceTo(it) < 65f }.forEach { npc ->
            npc.health -= 25f
            money += 10
            wantedLevel = (wantedLevel + 1).coerceAtMost(5)
            wantedTimer = 0f
        }
    }

    override fun draw(canvas: Canvas) {
        if (isInVehicle) return

        canvas.save()
        canvas.translate(x, y)
        canvas.rotate(rotation + 90f)

        canvas.drawOval(-14f, -10f, 14f, 16f, shadowPaint)

        // Legs
        paint.color = Color.parseColor("#5D4037")
        canvas.drawRect(-7f, 12f, -2f, 24f, paint)
        canvas.drawRect(2f, 12f, 7f, 24f, paint)

        // Body
        paint.color = Color.parseColor("#1565C0")
        canvas.drawRoundRect(-9f, -4f, 9f, 14f, 4f, 4f, paint)

        // Head
        canvas.drawCircle(0f, -11f, 9f, headPaint)

        // Direction dot
        canvas.drawCircle(0f, -21f, 3f, indicatorPaint)

        canvas.restore()
    }
}
