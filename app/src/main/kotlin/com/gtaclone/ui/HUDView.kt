package com.gtaclone.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.view.MotionEvent
import android.view.View
import com.gtaclone.engine.InputManager
import com.gtaclone.world.World3D

class HUDView(context: Context, private val world: World3D, private val joystick: VirtualJoystick) : View(context) {

    private val input = InputManager()

    private val bgPaint  = Paint().apply { isAntiAlias = true }
    private val fillPaint = Paint().apply { isAntiAlias = true }
    private val borderPaint = Paint().apply {
        color = Color.parseColor("#88FFFFFF"); style = Paint.Style.STROKE; strokeWidth = 2f; isAntiAlias = true
    }
    private val moneyPaint = Paint().apply {
        color = Color.parseColor("#00FF00"); textSize = 34f; textAlign = Paint.Align.RIGHT
        typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD); isAntiAlias = true
    }
    private val textPaint = Paint().apply {
        color = Color.WHITE; textSize = 26f; typeface = Typeface.MONOSPACE; isAntiAlias = true
    }
    private val timePaint = Paint().apply {
        color = Color.WHITE; textSize = 28f; textAlign = Paint.Align.CENTER
        typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD); isAntiAlias = true
    }
    private val starPaint = Paint().apply {
        textSize = 26f; typeface = Typeface.DEFAULT_BOLD; isAntiAlias = true
    }
    private val btnText = Paint().apply {
        color = Color.WHITE; textAlign = Paint.Align.CENTER
        typeface = Typeface.DEFAULT_BOLD; isAntiAlias = true
    }
    private val miniPaint = Paint().apply { isAntiAlias = false }

    init { setBackgroundColor(Color.TRANSPARENT) }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        joystick.init(w * 0.13f, h * 0.72f, h * 0.2f)
        invalidate()
    }

    override fun onTouchEvent(ev: MotionEvent): Boolean {
        input.handleTouch(ev, joystick, world, width.toFloat(), height.toFloat())
        return true
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        joystick.draw(canvas)
        drawMiniMap(canvas)
        drawHealth(canvas)
        drawMoney(canvas)
        drawWanted(canvas)
        drawTime(canvas)
        drawButtons(canvas)
        if (world.player.isInVehicle) drawVehicleHint(canvas)
        postInvalidateOnAnimation()
    }

    // ── Mini-map ──────────────────────────────────────────────────────────────
    private fun drawMiniMap(canvas: Canvas) {
        val size = height * 0.22f
        val mx = 20f; val my = 20f
        val city = world.city; val cs = city.citySize()
        val scale = size / cs

        bgPaint.color = Color.parseColor("#BB1a2a1a")
        canvas.drawRoundRect(mx, my, mx + size, my + size, 10f, 10f, bgPaint)

        // Road grid dots
        miniPaint.color = Color.parseColor("#555555")
        city.roadSlabs.forEach { s ->
            val px = mx + s.cx * scale; val py = my + s.cz * scale
            canvas.drawRect(px - s.w * scale * 0.5f, py - s.d * scale * 0.5f,
                px + s.w * scale * 0.5f, py + s.d * scale * 0.5f, miniPaint)
        }

        // NPCs
        miniPaint.color = Color.WHITE
        world.npcs.filter { it.health > 0f }.forEach { n ->
            canvas.drawCircle(mx + n.x * scale, my + n.z * scale, 2f, miniPaint)
        }
        // Vehicles
        miniPaint.color = Color.YELLOW
        world.vehicles.forEach { v ->
            canvas.drawCircle(mx + v.x * scale, my + v.z * scale, 3f, miniPaint)
        }
        // Player (green)
        miniPaint.color = Color.GREEN
        canvas.drawCircle(mx + world.player.x * scale, my + world.player.z * scale, 5f, miniPaint)

        borderPaint.color = Color.parseColor("#AAFFFFFF")
        canvas.drawRoundRect(mx, my, mx + size, my + size, 10f, 10f, borderPaint)
    }

    // ── Health ────────────────────────────────────────────────────────────────
    private fun drawHealth(canvas: Canvas) {
        val bx = 20f; val by = height * 0.22f + 30f; val bw = 180f; val bh = 18f
        val ratio = (world.player.health / 100f).coerceIn(0f, 1f)
        bgPaint.color = Color.parseColor("#88000000")
        canvas.drawRoundRect(bx - 4f, by - 4f, bx + bw + 50f, by + bh + 4f, 5f, 5f, bgPaint)
        fillPaint.color = when { ratio > 0.6f -> 0xFF4CAF50.toInt(); ratio > 0.3f -> 0xFFFFC107.toInt(); else -> 0xFFF44336.toInt() }
        if (ratio > 0f) canvas.drawRoundRect(bx, by, bx + bw * ratio, by + bh, 4f, 4f, fillPaint)
        textPaint.textSize = 16f
        canvas.drawText("HP ${world.player.health.toInt()}", bx + bw + 6f, by + bh - 1f, textPaint)
    }

    // ── Money ─────────────────────────────────────────────────────────────────
    private fun drawMoney(canvas: Canvas) {
        canvas.drawText("\$${String.format("%08d", world.player.money)}", width - 20f, 54f, moneyPaint)
    }

    // ── Wanted stars ──────────────────────────────────────────────────────────
    private fun drawWanted(canvas: Canvas) {
        val baseX = width - 178f
        starPaint.textSize = 26f; starPaint.textAlign = Paint.Align.LEFT
        for (i in 0 until 5) {
            starPaint.color = if (i < world.player.wantedLevel) Color.YELLOW else Color.parseColor("#444444")
            canvas.drawText("★", baseX + i * 32f, 92f, starPaint)
        }
    }

    // ── Clock ─────────────────────────────────────────────────────────────────
    private fun drawTime(canvas: Canvas) {
        val tw = timePaint.measureText("12:45")
        bgPaint.color = Color.parseColor("#88000000")
        canvas.drawRoundRect(width / 2f - tw / 2 - 12f, 10f, width / 2f + tw / 2 + 12f, 48f, 8f, 8f, bgPaint)
        canvas.drawText("12:45", width / 2f, 42f, timePaint)
    }

    // ── Action buttons ────────────────────────────────────────────────────────
    private fun drawButtons(canvas: Canvas) {
        val bs = height * 0.11f; val mg = 20f
        val rx = width - mg - bs; val by = height - mg - bs
        btn(canvas, rx - bs * 1.3f, by - bs * 1.3f, bs, Color.parseColor("#88FFAA00"), "CAR")
        btn(canvas, rx, by, bs, Color.parseColor("#88FF4444"), "ATK")
        btn(canvas, rx, by - bs * 1.3f, bs,
            if (world.player.sprinting) Color.parseColor("#CC44AAFF") else Color.parseColor("#5544AAFF"), "RUN")
    }

    private fun btn(canvas: Canvas, x: Float, y: Float, s: Float, color: Int, label: String) {
        fillPaint.color = color
        canvas.drawRoundRect(x, y, x + s, y + s, s * 0.28f, s * 0.28f, fillPaint)
        canvas.drawRoundRect(x, y, x + s, y + s, s * 0.28f, s * 0.28f, borderPaint)
        btnText.textSize = s * 0.28f
        canvas.drawText(label, x + s / 2, y + s * 0.62f, btnText)
    }

    private fun drawVehicleHint(canvas: Canvas) {
        textPaint.textAlign = Paint.Align.CENTER; textPaint.textSize = 20f; textPaint.color = Color.parseColor("#FFAA00")
        bgPaint.color = Color.parseColor("#88000000")
        canvas.drawRoundRect(width / 2f - 145f, height - 50f, width / 2f + 145f, height - 14f, 8f, 8f, bgPaint)
        canvas.drawText("DRAG RIGHT SIDE TO ROTATE CAMERA  ·  TAP CAR TO EXIT", width / 2f, height - 22f, textPaint)
    }
}
