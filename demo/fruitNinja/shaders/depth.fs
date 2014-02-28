#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D sampler0;
uniform float width;
uniform float height;

void main(void) {
  vec2 dim = vec2(width, height);
  vec2 p = vec2(width - gl_FragCoord.x, height - gl_FragCoord.y);

  vec2 x0y0 = p / dim;
  float depth = texture2D(sampler0, x0y0).r;

  if (depth < 0.13)
    gl_FragColor = vec4(0, 0, 0, 0);
  else
    gl_FragColor = vec4(depth, depth, 0, 0);
}