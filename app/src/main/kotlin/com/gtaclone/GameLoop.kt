package com.gtaclone

import android.graphics.Canvas
import android.view.SurfaceHolder

class GameLoop(
    private val surfaceHolder: SurfaceHolder,
    private val gameView: GameSurfaceView
) : Thread() {

    @Volatile private var running = false
    private val targetFrameTime = 1000L / 60

    fun startLoop() {
        running = true
        if (!isAlive) start()
    }

    fun stopLoop() {
        running = false
        try { join(2000) } catch (e: InterruptedException) { e.printStackTrace() }
    }

    override fun run() {
        var lastTime = System.currentTimeMillis()
        while (running) {
            val now = System.currentTimeMillis()
            val delta = ((now - lastTime) / 1000f).coerceAtMost(0.05f)
            lastTime = now

            gameView.update(delta)

            var canvas: Canvas? = null
            try {
                canvas = surfaceHolder.lockCanvas()
                synchronized(surfaceHolder) {
                    canvas?.let { gameView.draw(it) }
                }
            } finally {
                canvas?.let { surfaceHolder.unlockCanvasAndPost(it) }
            }

            val sleepMs = targetFrameTime - (System.currentTimeMillis() - now)
            if (sleepMs > 0) sleep(sleepMs)
        }
    }
}
