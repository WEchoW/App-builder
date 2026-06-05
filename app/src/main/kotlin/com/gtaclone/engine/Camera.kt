package com.gtaclone.engine

class Camera {
    var offsetX = 0f
    var offsetY = 0f
    var screenWidth = 1280f
    var screenHeight = 720f

    fun follow(targetX: Float, targetY: Float) {
        offsetX = targetX - screenWidth / 2f
        offsetY = targetY - screenHeight / 2f
    }

    fun isVisible(x: Float, y: Float, margin: Float = 120f): Boolean =
        x >= offsetX - margin && x <= offsetX + screenWidth + margin &&
        y >= offsetY - margin && y <= offsetY + screenHeight + margin
}
