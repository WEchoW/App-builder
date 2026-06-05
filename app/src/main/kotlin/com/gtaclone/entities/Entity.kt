package com.gtaclone.entities

import android.graphics.Canvas
import android.graphics.Paint
import kotlin.math.hypot

abstract class Entity(var x: Float, var y: Float) {
    var width = 32f
    var height = 48f
    var rotation = 0f
    var vx = 0f
    var vy = 0f
    var health = 100f

    protected val paint = Paint().apply { isAntiAlias = true }

    abstract fun draw(canvas: Canvas)

    fun distanceTo(other: Entity) = hypot(x - other.x, y - other.y)
}
