attribute vec2 position;

varying vec2 v_texCoord;

void main(void) {
  v_texCoord = position;
  gl_Position = vec4(position, 0, 1);
}