package com.gtaclone.world

import kotlin.random.Random

data class Box3D(
    val cx: Float, val cy: Float, val cz: Float,
    val w: Float,  val h: Float,  val d: Float,
    val rotY: Float = 0f,
    val r: Float,  val g: Float,  val b: Float
)

class City3D {
    val BLOCK = 40f
    val ROAD  = 10f
    val GRID  = 10

    val buildings  = mutableListOf<Box3D>()
    val roadSlabs  = mutableListOf<Box3D>()
    val parkTrees  = mutableListOf<Box3D>()

    private val colliders = mutableListOf<FloatArray>()  // [minX, minZ, maxX, maxZ]

    init { generate() }

    private fun bs(n: Int) = n * (BLOCK + ROAD)  // block start

    private fun generate() {
        val rng = Random(42)

        // Road slabs (slightly raised flat quads)
        val total = (GRID * (BLOCK + ROAD)).toFloat()
        for (n in 0 until GRID - 1) {
            val roadCenter = bs(n) + BLOCK + ROAD / 2
            // Horizontal road (runs along X)
            roadSlabs.add(Box3D(total / 2, 0.05f, roadCenter, total, 0.1f, ROAD, 0f, 0.27f, 0.27f, 0.27f))
            // Vertical road (runs along Z)
            roadSlabs.add(Box3D(roadCenter, 0.05f, total / 2, ROAD, 0.1f, total, 0f, 0.27f, 0.27f, 0.27f))
        }

        // Buildings
        val palette = listOf(
            Triple(0.48f, 0.38f, 0.22f), Triple(0.30f, 0.44f, 0.55f),
            Triple(0.55f, 0.30f, 0.30f), Triple(0.42f, 0.42f, 0.44f),
            Triple(0.35f, 0.50f, 0.34f)
        )

        for (bx in 0 until GRID) {
            for (bz in 0 until GRID) {
                // Park at blocks 4-5
                if (bx in 4..5 && bz in 4..5) { spawnPark(bs(bx), bs(bz)); continue }

                val x0 = bs(bx).toFloat(); val z0 = bs(bz).toFloat()
                val num = rng.nextInt(2) + 1
                for (i in 0 until num) {
                    val margin = 4f; val avail = BLOCK - margin * 2
                    val bw = avail * (0.35f + rng.nextFloat() * 0.55f)
                    val bd = avail * (0.35f + rng.nextFloat() * 0.55f)
                    val bh = 5f + rng.nextFloat() * 38f
                    val ox = margin + rng.nextFloat() * (avail - bw)
                    val oz = margin + rng.nextFloat() * (avail - bd)
                    val cx = x0 + ox + bw / 2; val cz = z0 + oz + bd / 2
                    val (r, g, b) = palette[(bx + bz + i) % palette.size]
                    buildings.add(Box3D(cx, bh / 2, cz, bw, bh, bd, 0f, r, g, b))
                    colliders.add(floatArrayOf(x0 + ox, z0 + oz, x0 + ox + bw, z0 + oz + bd))
                }
            }
        }
    }

    private fun spawnPark(x0: Float, z0: Float) {
        // Tree trunks + canopies
        val treePos = listOf(8f to 8f, 30f to 8f, 8f to 30f, 30f to 30f, 19f to 19f)
        treePos.forEach { (tx, tz) ->
            parkTrees.add(Box3D(x0 + tx, 1.5f, z0 + tz, 1f, 3f, 1f, 0f, 0.36f, 0.22f, 0.10f))
            parkTrees.add(Box3D(x0 + tx, 5f,   z0 + tz, 5f, 4f, 5f, 0f, 0.20f, 0.60f, 0.20f))
        }
    }

    fun isBlocked(x: Float, z: Float, radius: Float = 0.8f): Boolean =
        colliders.any { a -> x + radius > a[0] && x - radius < a[2] && z + radius > a[1] && z - radius < a[3] }

    fun citySize() = (GRID * (BLOCK + ROAD)).toFloat()
}
