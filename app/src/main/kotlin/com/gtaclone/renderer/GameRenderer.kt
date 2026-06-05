package com.gtaclone.renderer

import android.opengl.GLES20
import android.opengl.GLSurfaceView
import android.opengl.Matrix
import com.gtaclone.engine.BoxMesh
import com.gtaclone.engine.ShaderProgram
import com.gtaclone.entities.NPC3D
import com.gtaclone.entities.Vehicle3D
import com.gtaclone.ui.VirtualJoystick
import com.gtaclone.world.World3D
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10

class GameRenderer(private val world: World3D, private val joystick: VirtualJoystick) : GLSurfaceView.Renderer {

    private lateinit var shader: ShaderProgram
    private lateinit var box: BoxMesh

    // Attribute/uniform handles
    private var aPos = 0; private var aNrm = 0
    private var uMVP = 0; private var uNrm = 0
    private var uCol = 0; private var uLight = 0; private var uAmbient = 0

    private val proj   = FloatArray(16)
    private val view   = FloatArray(16)
    private val model  = FloatArray(16)
    private val temp   = FloatArray(16)
    private val mvp    = FloatArray(16)
    private val nrmMat = FloatArray(9)

    private val sunDir = floatArrayOf(0.55f, 1.0f, 0.4f)
    private var lastNanos = System.nanoTime()

    // ── Shader source ─────────────────────────────────────────────────────────

    private val VERT = """
        attribute vec4 aPosition;
        attribute vec3 aNormal;
        uniform mat4 uMVP;
        uniform mat3 uNrm;
        varying vec3 vNormal;
        void main() {
            gl_Position = uMVP * aPosition;
            vNormal = uNrm * aNormal;
        }
    """.trimIndent()

    private val FRAG = """
        precision mediump float;
        varying vec3 vNormal;
        uniform vec3 uColor;
        uniform vec3 uLight;
        uniform vec3 uAmbient;
        void main() {
            vec3 n = normalize(vNormal);
            float d = max(dot(n, normalize(uLight)), 0.0);
            vec3 col = uAmbient * uColor + d * uColor;
            gl_FragColor = vec4(col, 1.0);
        }
    """.trimIndent()

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
        GLES20.glClearColor(0.53f, 0.81f, 0.98f, 1f)  // sky blue
        GLES20.glEnable(GLES20.GL_DEPTH_TEST)
        GLES20.glEnable(GLES20.GL_CULL_FACE)

        shader = ShaderProgram(VERT, FRAG)
        box    = BoxMesh()

        aPos    = shader.attrib("aPosition")
        aNrm    = shader.attrib("aNormal")
        uMVP    = shader.uniform("uMVP")
        uNrm    = shader.uniform("uNrm")
        uCol    = shader.uniform("uColor")
        uLight  = shader.uniform("uLight")
        uAmbient = shader.uniform("uAmbient")
    }

    override fun onSurfaceChanged(gl: GL10?, width: Int, height: Int) {
        GLES20.glViewport(0, 0, width, height)
        Matrix.perspectiveM(proj, 0, 60f, width.toFloat() / height.toFloat(), 0.2f, 600f)
    }

    override fun onDrawFrame(gl: GL10?) {
        val now = System.nanoTime()
        val dt = ((now - lastNanos) / 1e9f).coerceAtMost(0.05f)
        lastNanos = now

        world.update(dt, joystick)

        GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT or GLES20.GL_DEPTH_BUFFER_BIT)

        world.camera.getViewMatrix(view)
        shader.use()
        GLES20.glUniform3fv(uLight,   1, sunDir, 0)
        GLES20.glUniform3f(uAmbient, 0.28f, 0.28f, 0.30f)

        drawScene()
    }

    // ── Scene drawing ─────────────────────────────────────────────────────────

    private fun drawScene() {
        val city = world.city
        val size = city.citySize()

        // Ground plane
        drawBox(size/2, -0.1f, size/2, size, 0.2f, size, 0f, 0.24f, 0.42f, 0.16f)

        // Road slabs
        city.roadSlabs.forEach { s -> drawBox(s.cx, s.cy, s.cz, s.w, s.h, s.d, s.rotY, s.r, s.g, s.b) }

        // Buildings
        city.buildings.forEach { b -> drawBox(b.cx, b.cy, b.cz, b.w, b.h, b.d, b.rotY, b.r, b.g, b.b) }

        // Building windows (thin bright strips on facade)
        city.buildings.forEach { b -> drawBuildingDetail(b.cx, b.cy, b.cz, b.w, b.h, b.d) }

        // Park trees
        city.parkTrees.forEach { t -> drawBox(t.cx, t.cy, t.cz, t.w, t.h, t.d, t.rotY, t.r, t.g, t.b) }

        // Vehicles
        world.vehicles.forEach { v -> drawVehicle(v) }

        // NPCs
        world.npcs.forEach { n -> if (n.health > 0f) drawNPC(n); else drawDead(n.x, n.z) }

        // Player (only visible if not in vehicle)
        if (!world.player.isInVehicle) drawPlayer()
    }

    // ── Entity drawers ────────────────────────────────────────────────────────

    private fun drawPlayer() {
        val p = world.player
        // Legs
        drawBox(p.x, 0.5f, p.z, 0.35f, 1.0f, 0.35f, p.rotY, 0.30f, 0.20f, 0.10f)
        // Body (blue shirt)
        drawBox(p.x, 1.4f, p.z, 0.75f, 0.9f, 0.45f, p.rotY, 0.12f, 0.38f, 0.72f)
        // Head (skin)
        drawBox(p.x, 2.2f, p.z, 0.55f, 0.55f, 0.55f, p.rotY, 0.90f, 0.72f, 0.56f)
    }

    private fun drawVehicle(v: Vehicle3D) {
        val (r, g, b) = v.color().let { Triple(it[0], it[1], it[2]) }
        // Body
        drawBox(v.x, v.h * 0.5f + 0.15f, v.z, v.w, v.h * 0.55f, v.d, v.rotY, r, g, b)
        // Cabin (slightly lighter)
        drawBox(v.x, v.h * 0.5f + 0.7f, v.z - v.d * 0.05f, v.w * 0.82f, v.h * 0.42f, v.d * 0.55f, v.rotY,
            (r + 0.15f).coerceAtMost(1f), (g + 0.15f).coerceAtMost(1f), (b + 0.15f).coerceAtMost(1f))
        // Windshield (blue-tinted glass)
        drawBox(v.x, v.h * 0.5f + 0.72f, v.z - v.d * 0.32f + offsetForward(v.rotY) * 0f,
            v.w * 0.78f, v.h * 0.30f, 0.08f, v.rotY, 0.55f, 0.75f, 0.95f)
        // Wheels (4 dark boxes)
        val wr = 0.2f; val wh = 0.45f; val ww = 0.25f
        drawWheel(v, -v.w * 0.55f, -v.d * 0.35f, wr, wh, ww)
        drawWheel(v,  v.w * 0.55f, -v.d * 0.35f, wr, wh, ww)
        drawWheel(v, -v.w * 0.55f,  v.d * 0.35f, wr, wh, ww)
        drawWheel(v,  v.w * 0.55f,  v.d * 0.35f, wr, wh, ww)
    }

    private fun drawWheel(v: Vehicle3D, lx: Float, lz: Float, wr: Float, wh: Float, ww: Float) {
        val rad = Math.toRadians(v.rotY.toDouble())
        val wx = v.x + (lx * Math.cos(rad) - lz * Math.sin(rad)).toFloat()
        val wz = v.z + (lx * Math.sin(rad) + lz * Math.cos(rad)).toFloat()
        drawBox(wx, wh / 2 + 0.05f, wz, ww, wh, wh * 1.5f, v.rotY, 0.15f, 0.15f, 0.15f)
    }

    private fun offsetForward(rotY: Float) = 0f

    private fun drawNPC(n: NPC3D) {
        val (r, g, b) = n.color().let { Triple(it[0], it[1], it[2]) }
        drawBox(n.x, 0.45f, n.z, 0.5f, 0.9f, 0.5f, n.rotY, 0.28f, 0.18f, 0.09f)
        drawBox(n.x, 1.2f,  n.z, 0.55f, 0.75f, 0.42f, n.rotY, r, g, b)
        drawBox(n.x, 1.85f, n.z, 0.48f, 0.48f, 0.48f, n.rotY, 0.90f, 0.72f, 0.56f)
    }

    private fun drawDead(x: Float, z: Float) {
        drawBox(x, 0.1f, z, 1.8f, 0.2f, 0.6f, 0f, 0.6f, 0.05f, 0.05f)
    }

    private fun drawBuildingDetail(cx: Float, cy: Float, cz: Float, w: Float, h: Float, d: Float) {
        // Window rows every 3 units of height
        var floor = 3f
        while (floor < h - 1f) {
            val wy = cy - h / 2 + floor
            // Front windows
            drawBox(cx, wy, cz + d / 2 + 0.02f, w * 0.6f, 0.8f, 0.05f, 0f, 0.85f, 0.90f, 0.70f)
            // Side windows
            drawBox(cx + w / 2 + 0.02f, wy, cz, 0.05f, 0.8f, d * 0.6f, 0f, 0.85f, 0.90f, 0.70f)
            floor += 3f
        }
    }

    // ── Core draw call ────────────────────────────────────────────────────────

    private fun drawBox(cx: Float, cy: Float, cz: Float,
                        w: Float, h: Float, d: Float, rotY: Float,
                        r: Float, g: Float, b: Float) {
        Matrix.setIdentityM(model, 0)
        Matrix.translateM(model, 0, cx, cy, cz)
        if (rotY != 0f) Matrix.rotateM(model, 0, rotY, 0f, 1f, 0f)
        Matrix.scaleM(model, 0, w, h, d)

        Matrix.multiplyMM(temp, 0, view,  0, model, 0)
        Matrix.multiplyMM(mvp,  0, proj,  0, temp,  0)
        GLES20.glUniformMatrix4fv(uMVP, 1, false, mvp, 0)

        // Normal matrix: rotation part only (no scale) — valid for axis-aligned box faces
        nrmMat[0] = model[0]; nrmMat[1] = model[1]; nrmMat[2] = model[2]
        nrmMat[3] = model[4]; nrmMat[4] = model[5]; nrmMat[5] = model[6]
        nrmMat[6] = model[8]; nrmMat[7] = model[9]; nrmMat[8] = model[10]
        GLES20.glUniformMatrix3fv(uNrm, 1, false, nrmMat, 0)

        GLES20.glUniform3f(uCol, r, g, b)
        box.draw(aPos, aNrm)
    }
}
