package com.gtaclone.entities

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint

class Vehicle(x: Float, y: Float, val bodyColor: Int) : Entity(x, y) {

    var maxSpeed = 350f
    var isOccupied = false

    init { width = 36f; height = 60f }

    private val windowPaint = Paint().apply { color = Color.parseColor("#B3E5FC"); isAntiAlias = true }
    private val wheelPaint = Paint().apply { color = Color.DKGRAY; isAntiAlias = true }
    private val shadowPaint = Paint().apply { color = Color.parseColor("#44000000"); isAntiAlias = true }
    private val lightPaint = Paint().apply { isAntiAlias = true }

    fun update(deltaTime: Float) {
        if (!isOccupied) { vx *= 0.85f; vy *= 0.85f }
    }

    override fun draw(canvas: Canvas) {
        canvas.save()
        canvas.translate(x, y)
        canvas.rotate(rotation + 90f)

        canvas.drawOval(-18f, -14f, 18f, 30f, shadowPaint)

        paint.color = bodyColor
        canvas.drawRoundRect(-16f, -24f, 16f, 28f, 6f, 6f, paint)

        // Wheels
        for (wx in listOf(-20f, 14f)) {
            canvas.drawRoundRect(wx, -20f, wx + 6f, -8f, 3f, 3f, wheelPaint)
            canvas.drawRoundRect(wx, 14f, wx + 6f, 26f, 3f, 3f, wheelPaint)
        }

        // Windows
        canvas.drawRoundRect(-12f, -20f, 12f, -4f, 4f, 4f, windowPaint)
        canvas.drawRoundRect(-12f, 4f, 12f, 16f, 4f, 4f, windowPaint)

        // Headlights
        lightPaint.color = Color.YELLOW
        canvas.drawRect(-13f, -28f, -5f, -24f, lightPaint)
        canvas.drawRect(5f, -28f, 13f, -24f, lightPaint)

        // Taillights
        lightPaint.color = Color.RED
        canvas.drawRect(-13f, 24f, -5f, 28f, lightPaint)
        canvas.drawRect(5f, 24f, 13f, 28f, lightPaint)

        canvas.restore()
    }
}
