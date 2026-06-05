package com.gtaclone

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.view.MotionEvent
import android.view.SurfaceHolder
import android.view.SurfaceView
import com.gtaclone.engine.Camera
import com.gtaclone.engine.InputManager
import com.gtaclone.ui.HUD
import com.gtaclone.ui.VirtualJoystick
import com.gtaclone.world.World

class GameSurfaceView(context: Context) : SurfaceView(context), SurfaceHolder.Callback {

    val world = World()
    val camera = Camera()
    val inputManager = InputManager()
    val joystick = VirtualJoystick()
    val hud = HUD(world)
    private val gameLoop = GameLoop(holder, this)
    private val bgPaint = Paint().apply { color = Color.BLACK }

    init {
        holder.addCallback(this)
        isFocusable = true
    }

    override fun surfaceCreated(holder: SurfaceHolder) {
        gameLoop.startLoop()
    }

    override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
        camera.screenWidth = width.toFloat()
        camera.screenHeight = height.toFloat()
        joystick.init(width * 0.13f, height * 0.72f, height * 0.2f)
        hud.init(width.toFloat(), height.toFloat())
    }

    override fun surfaceDestroyed(holder: SurfaceHolder) {
        gameLoop.stopLoop()
    }

    fun update(deltaTime: Float) {
        world.update(deltaTime, joystick)
        camera.follow(world.player.x, world.player.y)
    }

    fun draw(canvas: Canvas) {
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), bgPaint)
        canvas.save()
        canvas.translate(-camera.offsetX, -camera.offsetY)
        world.draw(canvas, camera)
        canvas.restore()
        hud.draw(canvas)
        joystick.draw(canvas)
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        inputManager.handleTouch(event, joystick, world, width.toFloat(), height.toFloat())
        return true
    }

    fun pause() { gameLoop.stopLoop() }
    fun resume() { if (holder.surface.isValid) gameLoop.startLoop() }
}
