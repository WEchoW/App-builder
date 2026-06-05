package com.gtaclone.engine

import android.opengl.GLES20
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import java.nio.ShortBuffer

class BoxMesh {

    private val posBuffer: FloatBuffer
    private val normBuffer: FloatBuffer
    private val idxBuffer: ShortBuffer

    companion object {
        // 24 vertices: 4 per face × 6 faces — positions
        private val POS = floatArrayOf(
            // Front  (z+)
            -0.5f,-0.5f, 0.5f,  0.5f,-0.5f, 0.5f,  0.5f, 0.5f, 0.5f, -0.5f, 0.5f, 0.5f,
            // Back   (z-)
             0.5f,-0.5f,-0.5f, -0.5f,-0.5f,-0.5f, -0.5f, 0.5f,-0.5f,  0.5f, 0.5f,-0.5f,
            // Left   (x-)
            -0.5f,-0.5f,-0.5f, -0.5f,-0.5f, 0.5f, -0.5f, 0.5f, 0.5f, -0.5f, 0.5f,-0.5f,
            // Right  (x+)
             0.5f,-0.5f, 0.5f,  0.5f,-0.5f,-0.5f,  0.5f, 0.5f,-0.5f,  0.5f, 0.5f, 0.5f,
            // Top    (y+)
            -0.5f, 0.5f, 0.5f,  0.5f, 0.5f, 0.5f,  0.5f, 0.5f,-0.5f, -0.5f, 0.5f,-0.5f,
            // Bottom (y-)
            -0.5f,-0.5f,-0.5f,  0.5f,-0.5f,-0.5f,  0.5f,-0.5f, 0.5f, -0.5f,-0.5f, 0.5f,
        )

        private val NRM = floatArrayOf(
            0f,0f,1f,  0f,0f,1f,  0f,0f,1f,  0f,0f,1f,   // front
            0f,0f,-1f, 0f,0f,-1f, 0f,0f,-1f, 0f,0f,-1f,  // back
            -1f,0f,0f,-1f,0f,0f, -1f,0f,0f, -1f,0f,0f,   // left
            1f,0f,0f,  1f,0f,0f,  1f,0f,0f,  1f,0f,0f,   // right
            0f,1f,0f,  0f,1f,0f,  0f,1f,0f,  0f,1f,0f,   // top
            0f,-1f,0f, 0f,-1f,0f, 0f,-1f,0f, 0f,-1f,0f,  // bottom
        )

        private val IDX = shortArrayOf(
            0,1,2, 0,2,3,   4,5,6, 4,6,7,
            8,9,10, 8,10,11, 12,13,14, 12,14,15,
            16,17,18, 16,18,19, 20,21,22, 20,22,23
        )
    }

    init {
        posBuffer  = floatBuf(POS)
        normBuffer = floatBuf(NRM)
        idxBuffer  = ByteBuffer.allocateDirect(IDX.size * 2)
            .order(ByteOrder.nativeOrder()).asShortBuffer().apply { put(IDX); rewind() }
    }

    private fun floatBuf(data: FloatArray) = ByteBuffer.allocateDirect(data.size * 4)
        .order(ByteOrder.nativeOrder()).asFloatBuffer().apply { put(data); rewind() }

    fun draw(aPos: Int, aNrm: Int) {
        GLES20.glEnableVertexAttribArray(aPos)
        GLES20.glEnableVertexAttribArray(aNrm)
        GLES20.glVertexAttribPointer(aPos, 3, GLES20.GL_FLOAT, false, 12, posBuffer.apply { position(0) })
        GLES20.glVertexAttribPointer(aNrm, 3, GLES20.GL_FLOAT, false, 12, normBuffer.apply { position(0) })
        GLES20.glDrawElements(GLES20.GL_TRIANGLES, IDX.size, GLES20.GL_UNSIGNED_SHORT, idxBuffer.apply { position(0) })
        GLES20.glDisableVertexAttribArray(aPos)
        GLES20.glDisableVertexAttribArray(aNrm)
    }
}
