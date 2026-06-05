package com.gtaclone.world

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import com.gtaclone.engine.Camera

enum class TileType(val color: Int) {
    GRASS(Color.parseColor("#3d6b35")),
    ROAD(Color.parseColor("#444444")),
    SIDEWALK(Color.parseColor("#888888")),
    BUILDING_A(Color.parseColor("#7a5c2e")),
    BUILDING_B(Color.parseColor("#4a6e8a")),
    BUILDING_C(Color.parseColor("#8a4a4a")),
    PARK(Color.parseColor("#4CAF50"))
}

class TileMap(val cols: Int = 80, val rows: Int = 80) {

    val tileSize = 64f
    val tiles = Array(rows) { Array(cols) { TileType.GRASS } }

    private val tilePaint = Paint().apply { isAntiAlias = false }
    private val linePaint = Paint().apply {
        color = Color.parseColor("#CCCC00")
        strokeWidth = 2f
    }

    init { generate() }

    private fun generate() {
        val interval = 10  // road every 10 tiles
        for (r in 0 until rows) {
            for (c in 0 until cols) {
                val rr = r % interval
                val rc = c % interval
                val onRoadRow = rr == 0 || rr == 1
                val onRoadCol = rc == 0 || rc == 1
                val onSidewalkRow = rr == 2 || rr == interval - 1
                val onSidewalkCol = rc == 2 || rc == interval - 1

                tiles[r][c] = when {
                    onRoadRow || onRoadCol -> TileType.ROAD
                    onSidewalkRow || onSidewalkCol -> TileType.SIDEWALK
                    rr in 3 until interval - 1 && rc in 3 until interval - 1 ->
                        when ((r / interval + c / interval) % 3) {
                            0 -> TileType.BUILDING_A
                            1 -> TileType.BUILDING_B
                            else -> TileType.BUILDING_C
                        }
                    else -> TileType.SIDEWALK
                }
            }
        }
        // Park in the centre of the map
        for (r in 34..40) for (c in 34..40) if (r < rows && c < cols) tiles[r][c] = TileType.PARK
    }

    fun isWalkable(wx: Float, wy: Float): Boolean {
        val c = (wx / tileSize).toInt()
        val r = (wy / tileSize).toInt()
        if (r !in 0 until rows || c !in 0 until cols) return false
        return tiles[r][c] != TileType.BUILDING_A &&
               tiles[r][c] != TileType.BUILDING_B &&
               tiles[r][c] != TileType.BUILDING_C
    }

    fun worldWidth() = cols * tileSize
    fun worldHeight() = rows * tileSize

    fun draw(canvas: Canvas, camera: Camera) {
        val c0 = ((camera.offsetX / tileSize) - 1).toInt().coerceAtLeast(0)
        val c1 = ((camera.offsetX + camera.screenWidth) / tileSize + 1).toInt().coerceAtMost(cols)
        val r0 = ((camera.offsetY / tileSize) - 1).toInt().coerceAtLeast(0)
        val r1 = ((camera.offsetY + camera.screenHeight) / tileSize + 1).toInt().coerceAtMost(rows)

        for (r in r0 until r1) {
            for (c in c0 until c1) {
                val tile = tiles[r][c]
                tilePaint.color = tile.color
                val left = c * tileSize
                val top = r * tileSize
                canvas.drawRect(left, top, left + tileSize, top + tileSize, tilePaint)

                // Yellow centre line on roads
                if (tile == TileType.ROAD) drawCentreLine(canvas, r, c)
            }
        }
    }

    private fun drawCentreLine(canvas: Canvas, r: Int, c: Int) {
        val interval = 10
        val rr = r % interval; val rc = c % interval
        val onHRoad = rr == 0 || rr == 1
        val onVRoad = rc == 0 || rc == 1
        if (rr == 0 && !onVRoad) {
            val cy = r * tileSize + tileSize / 2
            canvas.drawLine(c * tileSize, cy, (c + 1) * tileSize, cy, linePaint)
        }
        if (rc == 0 && !onHRoad) {
            val cx = c * tileSize + tileSize / 2
            canvas.drawLine(cx, r * tileSize, cx, (r + 1) * tileSize, linePaint)
        }
    }
}
