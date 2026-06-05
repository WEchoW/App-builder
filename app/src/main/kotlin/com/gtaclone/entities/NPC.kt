package com.gtaclone.entities

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import com.gtaclone.world.World
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.sin
import kotlin.random.Random

class NPC(x: Float, y: Float) : Entity(x, y) {

    private val walkSpeed = 80f
    private var targetX = x
    private var targetY = y
    private var thinkTimer = Random.nextFloat() * 2f
    private var fleeing = false

    private val bodyColor = listOf(
        Color.parseColor("#E91E63"), Color.parseColor("#FF5722"),
        Color.parseColor("#9C27B0"), Color.parseColor("#00BCD4"),
        Color.parseColor("#8BC34A")
    ).random()

    private val headPaint = Paint().apply { color = Color.parseColor("#FFCC99"); isAntiAlias = true }
    private val shadowPaint = Paint().apply { color = Color.parseColor("#33000000"); isAntiAlias = true }
    private val deadPaint = Paint().apply { color = Color.parseColor("#88FF0000"); isAntiAlias = true }

    init { width = 24f; height = 36f }

    fun update(deltaTime: Float, world: World) {
        if (health <= 0f) return

        val player = world.player
        val dist = distanceTo(player)

        if (player.wantedLevel > 0 && dist < 320f) {
            fleeing = true
            val angle = atan2(y - player.y, x - player.x)
            targetX = x + cos(angle) * 250f
            targetY = y + sin(angle) * 250f
        } else {
            fleeing = false
            thinkTimer -= deltaTime
            if (thinkTimer <= 0f) {
                targetX = x + Random.nextFloat() * 240f - 120f
                targetY = y + Random.nextFloat() * 240f - 120f
                thinkTimer = Random.nextFloat() * 3f + 1.5f
            }
        }

        val dx = targetX - x
        val dy = targetY - y
        val d = hypot(dx, dy)
        if (d > 8f) {
            val speed = if (fleeing) walkSpeed * 1.9f else walkSpeed
            rotation = Math.toDegrees(atan2(dy.toDouble(), dx.toDouble())).toFloat()
            val nx = x + (dx / d) * speed * deltaTime
            val ny = y + (dy / d) * speed * deltaTime
            if (world.tileMap.isWalkable(nx, y)) x = nx
            if (world.tileMap.isWalkable(x, ny)) y = ny
        }

        x = x.coerceIn(32f, world.tileMap.worldWidth() - 32f)
        y = y.coerceIn(32f, world.tileMap.worldHeight() - 32f)
    }

    override fun draw(canvas: Canvas) {
        if (health <= 0f) { canvas.drawCircle(x, y, 14f, deadPaint); return }

        canvas.save()
        canvas.translate(x, y)
        canvas.rotate(rotation + 90f)

        canvas.drawOval(-10f, -6f, 10f, 10f, shadowPaint)

        paint.color = bodyColor
        canvas.drawRoundRect(-6f, -3f, 6f, 13f, 3f, 3f, paint)
        canvas.drawCircle(0f, -8f, 7f, headPaint)

        canvas.restore()
    }
}
