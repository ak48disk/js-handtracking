function ShadowRenderer(video, canvas) {
  //check support
  if (!supportsWebGL()) {
    console.log("no WebGL");
    return;
  }

  gl = getWebGLContext(canvas);

  //create a program
  createProgramFromURIs(gl, {
    vsURI: 'shaders/simple.vs',
    fsURI: 'shaders/depth.fs',
    onComplete: function(program) {
      render(program);
    }
  });

  function render(program) {
    gl.useProgram(program);

    var widthLocation = gl.getUniformLocation(program, 'width'),
        heightLocation = gl.getUniformLocation(program, 'height'),
        samplerLocation = gl.getUniformLocation(program, 'sampler0'),
        positionLocation = gl.getAttribLocation(program, 'position'),
        mirrorLocation = gl.getUniformLocation(program, 'mirror'),
        buffer = gl.createBuffer(),
        vertices = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1],
        //vertices = [0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,  1.0, 1.0, 0.0, 1.0,  1.0],
        texture = gl.createTexture();

    gl.uniform1f(mirrorLocation, GameControl.mirror ? 1.0 : 0.0);
    //set uniform size data
    gl.uniform1f(widthLocation, canvas.width);
    gl.uniform1f(heightLocation, canvas.height);

    //set texture sampler
    gl.uniform1i(samplerLocation, 0);
    //set position attribute data
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    //set properties for the texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null);

    window.requestAnimationFrame(function loop() {
      gl.uniform1f(mirrorLocation, GameControl.mirror ? 1.0 : 0.0);
      //set uniform size data
      //canvas.width = video.offsetWidth;
      //canvas.height = video.offsetHeight;
      gl.uniform1f(widthLocation, canvas.width);
      gl.uniform1f(heightLocation, canvas.height);
      gl.viewport(0, 0, canvas.width, canvas.height);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      //draw rectangle
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindTexture(gl.TEXTURE_2D, null);
      //request next frame to render
      window.requestAnimationFrame(loop);
    });
  }

}