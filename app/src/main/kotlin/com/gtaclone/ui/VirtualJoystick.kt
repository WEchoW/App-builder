package com.gtaclone.ui

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import kotlin.math.hypot

class VirtualJoystick {

    var centerX = 200f; var centerY = 600f
    private var outerR = 120f; private var innerR = 46f

    var dirX = 0f; var dirY = 0f
    private var thumbX = centerX; private var thumbY = centerY

    private val fillPaint = Paint().apply { color = Color.parseColor("#44FFFFFF"); isAntiAlias = true }
    private val ringPaint = Paint().apply {
        color = Color.parseColor("#99FFFFFF"); style = Paint.Style.STROKE; strokeWidth = 3f; isAntiAlias = true
    }
    private val thumbPaint = Paint().apply { color = Color.parseColor("#CCFFFFFF"); isAntiAlias = true }
    private val arrowPaint = Paint().apply {
        color = Color.parseColor("#AAFFFFFF"); style = Paint.Style.STROKE; strokeWidth = 3f; isAntiAlias = true
    }

    fun init(cx: Float, cy: Float, radius: Float) {
        centerX = cx; centerY = cy; outerR = radius; innerR = radius * 0.38f
        thumbX = cx; thumbY = cy
    }

    fun contains(x: Float, y: Float) = hypot(x - centerX, y - centerY) <= outerR

    fun onTouchDown(x: Float, y: Float) = move(x, y)
    fun onTouchMove(x: Float, y: Float) = move(x, y)
    fun onTouchUp() { thumbX = centerX; thumbY = centerY; dirX = 0f; dirY = 0f }

    private fun move(x: Float, y: Float) {
        val dx = x - centerX; val dy = y - centerY
        val dist = hypot(dx, dy); val max = outerR - innerR
        if (dist > max) { thumbX = centerX + dx / dist * max; thumbY = centerY + dy / dist * max }
        else { thumbX = x; thumbY = y }
        dirX = (thumbX - centerX) / max; dirY = (thumbY - centerY) / max
    }

    fun draw(canvas: Canvas) {
        canvas.drawCircle(centerX, centerY, outerR, fillPaint)
        canvas.drawCircle(centerX, centerY, outerR, ringPaint)
        arrow(canvas, centerX, centerY - outerR * 0.62f, 0f)
        arrow(canvas, centerX, centerY + outerR * 0.62f, 180f)
        arrow(canvas, centerX - outerR * 0.62f, centerY, -90f)
        arrow(canvas, centerX + outerR * 0.62f, centerY, 90f)
        canvas.drawCircle(thumbX, thumbY, innerR, thumbPaint)
    }

    private fun arrow(c: Canvas, x: Float, y: Float, a: Float) {
        c.save(); c.translate(x, y); c.rotate(a)
        c.drawLine(0f, -9f, 0f, 9f, arrowPaint)
        c.drawLine(-7f, 2f, 0f, -7f, arrowPaint)
        c.drawLine(7f, 2f, 0f, -7f, arrowPaint)
        c.restore()
    }
}
