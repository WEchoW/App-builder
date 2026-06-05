package com.gtaclone.ui

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import com.gtaclone.world.TileType
import com.gtaclone.world.World

class HUD(private val world: World) {

    private var sw = 1280f
    private var sh = 720f

    private val bgPaint = Paint().apply { isAntiAlias = true }
    private val fillPaint = Paint().apply { isAntiAlias = true }
    private val borderPaint = Paint().apply {
        color = Color.parseColor("#AAFFFFFF"); style = Paint.Style.STROKE
        strokeWidth = 2f; isAntiAlias = true
    }
    private val textPaint = Paint().apply {
        color = Color.WHITE; textSize = 30f
        typeface = Typeface.MONOSPACE; isAntiAlias = true
    }
    private val moneyPaint = Paint().apply {
        color = Color.parseColor("#00FF00"); textSize = 36f
        typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
        textAlign = Paint.Align.RIGHT; isAntiAlias = true
    }
    private val starPaint = Paint().apply {
        textSize = 28f; typeface = Typeface.DEFAULT_BOLD
        textAlign = Paint.Align.LEFT; isAntiAlias = true
    }
    private val timePaint = Paint().apply {
        color = Color.WHITE; textSize = 30f
        typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
        textAlign = Paint.Align.CENTER; isAntiAlias = true
    }
    private val btnTextPaint = Paint().apply {
        color = Color.WHITE; textSize = 22f
        textAlign = Paint.Align.CENTER
        typeface = Typeface.DEFAULT_BOLD; isAntiAlias = true
    }
    private val miniTilePaint = Paint().apply { isAntiAlias = false }

    fun init(w: Float, h: Float) { sw = w; sh = h }

    fun draw(canvas: Canvas) {
        drawMiniMap(canvas)
        drawHealth(canvas)
        drawMoney(canvas)
        drawWanted(canvas)
        drawTime(canvas)
        drawButtons(canvas)
    }

    // ── Mini-map ─────────────────────────────────────────────────────────────
    private fun drawMiniMap(canvas: Canvas) {
        val size = sh * 0.22f
        val mx = 20f; val my = 20f
        val tileMap = world.tileMap
        val scale = size / (tileMap.cols * tileMap.tileSize)

        bgPaint.color = Color.parseColor("#BB000000")
        canvas.drawRoundRect(mx, my, mx + size, my + size, 10f, 10f, bgPaint)

        // Simplified tile layer (skip every other tile for speed)
        for (r in 0 until tileMap.rows step 2) {
            for (c in 0 until tileMap.cols step 2) {
                miniTilePaint.color = when (tileMap.tiles[r][c]) {
                    TileType.ROAD -> Color.parseColor("#666666")
                    TileType.BUILDING_A, TileType.BUILDING_B, TileType.BUILDING_C -> Color.parseColor("#885555")
                    TileType.PARK -> Color.parseColor("#557744")
                    else -> Color.TRANSPARENT
                }
                if (miniTilePaint.color == Color.TRANSPARENT) continue
                val px = mx + c * tileMap.tileSize * scale
                val py = my + r * tileMap.tileSize * scale
                val ps = tileMap.tileSize * scale * 2.1f
                canvas.drawRect(px, py, px + ps, py + ps, miniTilePaint)
            }
        }

        // Vehicles
        miniTilePaint.color = Color.YELLOW
        world.vehicles.forEach { v ->
            canvas.drawCircle(mx + v.x * scale, my + v.y * scale, 3f, miniTilePaint)
        }
        // NPCs
        miniTilePaint.color = Color.WHITE
        world.npcs.filter { it.health > 0f }.forEach { n ->
            canvas.drawCircle(mx + n.x * scale, my + n.y * scale, 2f, miniTilePaint)
        }
        // Player
        miniTilePaint.color = Color.GREEN
        canvas.drawCircle(mx + world.player.x * scale, my + world.player.y * scale, 5f, miniTilePaint)

        canvas.drawRoundRect(mx, my, mx + size, my + size, 10f, 10f, borderPaint)
    }

    // ── Health bar ────────────────────────────────────────────────────────────
    private fun drawHealth(canvas: Canvas) {
        val bx = 20f; val by = sh * 0.22f + 32f
        val bw = 180f; val bh = 18f
        val ratio = (world.player.health / 100f).coerceIn(0f, 1f)

        bgPaint.color = Color.parseColor("#88000000")
        canvas.drawRoundRect(bx - 4f, by - 4f, bx + bw + 4f, by + bh + 4f, 5f, 5f, bgPaint)

        fillPaint.color = when {
            ratio > 0.6f -> Color.parseColor("#4CAF50")
            ratio > 0.3f -> Color.parseColor("#FFC107")
            else -> Color.parseColor("#F44336")
        }
        if (ratio > 0f) canvas.drawRoundRect(bx, by, bx + bw * ratio, by + bh, 4f, 4f, fillPaint)

        textPaint.textSize = 16f; textPaint.textAlign = Paint.Align.LEFT
        canvas.drawText("HP ${world.player.health.toInt()}", bx + bw + 8f, by + bh - 1f, textPaint)
    }

    // ── Money ─────────────────────────────────────────────────────────────────
    private fun drawMoney(canvas: Canvas) {
        canvas.drawText("\$${String.format("%08d", world.player.money)}", sw - 20f, 56f, moneyPaint)
    }

    // ── Wanted stars ──────────────────────────────────────────────────────────
    private fun drawWanted(canvas: Canvas) {
        val baseX = sw - 180f; val y = 96f
        starPaint.textSize = 28f
        for (i in 0 until 5) {
            starPaint.color = if (i < world.player.wantedLevel) Color.YELLOW else Color.parseColor("#444444")
            canvas.drawText("★", baseX + i * 34f, y, starPaint)
        }
    }

    // ── Clock ─────────────────────────────────────────────────────────────────
    private fun drawTime(canvas: Canvas) {
        val text = "12:45"
        val tw = timePaint.measureText(text)
        bgPaint.color = Color.parseColor("#88000000")
        canvas.drawRoundRect(sw / 2 - tw / 2 - 12f, 10f, sw / 2 + tw / 2 + 12f, 50f, 8f, 8f, bgPaint)
        canvas.drawText(text, sw / 2, 44f, timePaint)
    }

    // ── Action buttons ────────────────────────────────────────────────────────
    private fun drawButtons(canvas: Canvas) {
        val btnSize = sh * 0.11f
        val margin = 20f
        val rx = sw - margin - btnSize
        val by = sh - margin - btnSize

        drawBtn(canvas, rx - btnSize * 1.3f, by - btnSize * 1.3f, btnSize, Color.parseColor("#88FFAA00"), "CAR")
        drawBtn(canvas, rx, by, btnSize, Color.parseColor("#88FF4444"), "ATK")
        drawBtn(canvas, rx, by - btnSize * 1.3f, btnSize,
            if (world.player.sprinting) Color.parseColor("#CC44AAFF") else Color.parseColor("#5544AAFF"), "RUN")

        if (world.player.isInVehicle) {
            textPaint.textAlign = Paint.Align.CENTER; textPaint.textSize = 20f; textPaint.color = Color.parseColor("#FFAA00")
            bgPaint.color = Color.parseColor("#88000000")
            canvas.drawRoundRect(sw / 2 - 140f, sh - 50f, sw / 2 + 140f, sh - 14f, 8f, 8f, bgPaint)
            canvas.drawText("TAP  CAR  TO  EXIT  VEHICLE", sw / 2, sh - 22f, textPaint)
        }
    }

    private fun drawBtn(canvas: Canvas, x: Float, y: Float, size: Float, color: Int, label: String) {
        fillPaint.color = color
        canvas.drawRoundRect(x, y, x + size, y + size, size * 0.28f, size * 0.28f, fillPaint)
        canvas.drawRoundRect(x, y, x + size, y + size, size * 0.28f, size * 0.28f, borderPaint)
        btnTextPaint.textSize = size * 0.28f
        canvas.drawText(label, x + size / 2, y + size * 0.62f, btnTextPaint)
    }
}
