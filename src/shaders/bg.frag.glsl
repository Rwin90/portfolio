precision highp float;

uniform vec3 uTopColor;
uniform vec3 uBottomColor;

varying vec2 vUv;

void main() {

    float gradient = smoothstep(0.0, 1.0, vUv.y);

    vec3 color = mix(
        uBottomColor,
        uTopColor,
        gradient
    );

    gl_FragColor = vec4(color, 1.0);

}
