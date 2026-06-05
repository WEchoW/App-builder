package com.gtaclone

import android.os.Bundle
import android.view.Window
import android.view.WindowManager
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import com.gtaclone.ui.HUDView
import com.gtaclone.ui.VirtualJoystick
import com.gtaclone.world.World3D

class MainActivity : AppCompatActivity() {

    private lateinit var glView: GameGLSurfaceView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestWindowFeature(Window.FEATURE_NO_TITLE)
        window.setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        val world = World3D()
        val joystick = VirtualJoystick()

        glView = GameGLSurfaceView(this, world, joystick)
        val hudView = HUDView(this, world, joystick)

        setContentView(R.layout.activity_main)
        val frame = findViewById<FrameLayout>(R.id.rootFrame)
        frame.addView(glView)
        frame.addView(hudView)
    }

    override fun onPause() { super.onPause(); glView.onPause() }
    override fun onResume() { super.onResume(); glView.onResume() }
}
