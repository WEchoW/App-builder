package com.gtaclone.entities

import com.gtaclone.ui.VirtualJoystick
import com.gtaclone.world.World3D
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin

class Player3D(x: Float, z: Float) : Entity3D(x, 0f, z) {
    override val w = 0.8f; override val h = 1.8f; override val d = 0.5f

    var money = 500
    var wantedLevel = 0
    var wantedTimer = 0f
    var sprinting = false
    var isInVehicle = false
    var currentVehicle: Vehicle3D? = null

    private val walkSpeed = 7f
    private val sprintSpeed = 13f

    override fun color() = floatArrayOf(0.12f, 0.38f, 0.72f)  // blue shirt

    fun update(dt: Float, joystick: VirtualJoystick, world: World3D) {
        if (isInVehicle) { driveVehicle(dt, joystick, world); return }

        val dx = joystick.dirX; val dz = joystick.dirY
        if (dx != 0f || dz != 0f) {
            rotY = Math.toDegrees(atan2(dx.toDouble(), dz.toDouble())).toFloat()
            val speed = if (sprinting) sprintSpeed else walkSpeed
            val nx = x + dx * speed * dt
            val nz = z + dz * speed * dt
            if (!world.city.isBlocked(nx, z)) x = nx
            if (!world.city.isBlocked(x, nz)) z = nz
        }

        val size = world.city.citySize()
        x = x.coerceIn(1f, size - 1f); z = z.coerceIn(1f, size - 1f)

        // Update camera
        world.camera.px = x; world.camera.py = y; world.camera.pz = z
        world.camera.yaw = rotY

        decreaseWanted(dt)
    }

    private fun driveVehicle(dt: Float, joystick: VirtualJoystick, world: World3D) {
        val car = currentVehicle ?: return
        val dx = joystick.dirX; val dz = joystick.dirY
        if (dx != 0f || dz != 0f) {
            car.rotY = Math.toDegrees(atan2(dx.toDouble(), dz.toDouble())).toFloat()
            val speed = if (sprinting) car.maxSpeed * 1.5f else car.maxSpeed
            val rad = Math.toRadians(car.rotY.toDouble())
            car.vx = sin(rad).toFloat() * speed
            car.vz = cos(rad).toFloat() * speed
        } else { car.vx *= 0.88f; car.vz *= 0.88f }

        val nx = car.x + car.vx * dt; val nz = car.z + car.vz * dt
        if (!world.city.isBlocked(nx, car.z, 1.5f)) car.x = nx
        if (!world.city.isBlocked(car.x, nz, 1.5f)) car.z = nz
        x = car.x; z = car.z; rotY = car.rotY

        world.camera.px = x; world.camera.py = car.h; world.camera.pz = z
        world.camera.yaw = rotY
        decreaseWanted(dt)
    }

    fun tryEnterExitVehicle(world: World3D) {
        if (isInVehicle) {
            currentVehicle?.isOccupied = false; currentVehicle = null; isInVehicle = false
        } else {
            world.getNearestVehicle(x, z)?.let { car ->
                car.isOccupied = true; currentVehicle = car; isInVehicle = true
                x = car.x; z = car.z
            }
        }
    }

    fun attack(world: World3D) {
        world.npcs.filter { it.health > 0f && distanceTo(it) < 4f }.forEach { npc ->
            npc.health -= 30f; money += 10
            wantedLevel = (wantedLevel + 1).coerceAtMost(5); wantedTimer = 0f
        }
    }

    private fun decreaseWanted(dt: Float) {
        if (wantedLevel > 0) { wantedTimer += dt; if (wantedTimer > 10f) { wantedLevel--; wantedTimer = 0f } }
    }
}
