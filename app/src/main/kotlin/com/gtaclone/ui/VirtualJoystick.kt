package com.gtaclone.ui

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import kotlin.math.hypot

class VirtualJoystick {

    var centerX = 200f
    var centerY = 600f
    private var outerRadius = 120f
    private var innerRadius = 46f

    var dirX = 0f
    var dirY = 0f
    private var thumbX = centerX
    private var thumbY = centerY

    private val outerFillPaint = Paint().apply { color = Color.parseColor("#44FFFFFF"); isAntiAlias = true }
    private val outerBorderPaint = Paint().apply {
        color = Color.parseColor("#99FFFFFF"); style = Paint.Style.STROKE
        strokeWidth = 3f; isAntiAlias = true
    }
    private val thumbPaint = Paint().apply { color = Color.parseColor("#CCFFFFFF"); isAntiAlias = true }
    private val arrowPaint = Paint().apply {
        color = Color.parseColor("#AAFFFFFF"); style = Paint.Style.STROKE
        strokeWidth = 3f; isAntiAlias = true
    }

    fun init(cx: Float, cy: Float, radius: Float) {
        centerX = cx; centerY = cy
        outerRadius = radius
        innerRadius = radius * 0.38f
        thumbX = cx; thumbY = cy
    }

    fun contains(x: Float, y: Float) = hypot(x - centerX, y - centerY) <= outerRadius

    fun onTouchDown(x: Float, y: Float) = updateThumb(x, y)
    fun onTouchMove(x: Float, y: Float) = updateThumb(x, y)

    fun onTouchUp() {
        thumbX = centerX; thumbY = centerY; dirX = 0f; dirY = 0f
    }

    private fun updateThumb(x: Float, y: Float) {
        val dx = x - centerX; val dy = y - centerY
        val dist = hypot(dx, dy)
        val maxDist = outerRadius - innerRadius
        if (dist > maxDist) {
            thumbX = centerX + (dx / dist) * maxDist
            thumbY = centerY + (dy / dist) * maxDist
        } else {
            thumbX = x; thumbY = y
        }
        dirX = (thumbX - centerX) / maxDist
        dirY = (thumbY - centerY) / maxDist
    }

    fun draw(canvas: Canvas) {
        canvas.drawCircle(centerX, centerY, outerRadius, outerFillPaint)
        canvas.drawCircle(centerX, centerY, outerRadius, outerBorderPaint)
        drawArrow(canvas, centerX, centerY - outerRadius * 0.62f, 0f)
        drawArrow(canvas, centerX, centerY + outerRadius * 0.62f, 180f)
        drawArrow(canvas, centerX - outerRadius * 0.62f, centerY, -90f)
        drawArrow(canvas, centerX + outerRadius * 0.62f, centerY, 90f)
        canvas.drawCircle(thumbX, thumbY, innerRadius, thumbPaint)
    }

    private fun drawArrow(canvas: Canvas, x: Float, y: Float, angle: Float) {
        canvas.save()
        canvas.translate(x, y); canvas.rotate(angle)
        canvas.drawLine(0f, -9f, 0f, 9f, arrowPaint)
        canvas.drawLine(-7f, 2f, 0f, -7f, arrowPaint)
        canvas.drawLine(7f, 2f, 0f, -7f, arrowPaint)
        canvas.restore()
    }
}
