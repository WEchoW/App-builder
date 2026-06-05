package com.gtaclone.engine

import android.opengl.GLES20

class ShaderProgram(vertSrc: String, fragSrc: String) {

    val id: Int

    init {
        val vs = compileShader(GLES20.GL_VERTEX_SHADER, vertSrc)
        val fs = compileShader(GLES20.GL_FRAGMENT_SHADER, fragSrc)
        id = GLES20.glCreateProgram()
        GLES20.glAttachShader(id, vs)
        GLES20.glAttachShader(id, fs)
        GLES20.glLinkProgram(id)
        GLES20.glDeleteShader(vs)
        GLES20.glDeleteShader(fs)
    }

    private fun compileShader(type: Int, src: String): Int {
        val shader = GLES20.glCreateShader(type)
        GLES20.glShaderSource(shader, src)
        GLES20.glCompileShader(shader)
        return shader
    }

    fun use() = GLES20.glUseProgram(id)
    fun attrib(name: String) = GLES20.glGetAttribLocation(id, name)
    fun uniform(name: String) = GLES20.glGetUniformLocation(id, name)
}
