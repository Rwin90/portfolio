precision highp float;

attribute vec3 instanceOffset;

uniform float uTime;
uniform vec3 uMouse;
uniform float uRadius;

varying float vDepth;
varying float vOrganic;

void main() {

    vec3 pos = position + instanceOffset;

    // organic breathing motion
    float breath =
        sin(uTime * 0.6 + instanceOffset.x * 0.5) * 0.15;

    pos.y *= 1.0 + breath;

    // lateral drift
    float drift =
        sin(uTime * 0.4 + position.y * 2.0) * 0.05;

    pos.x += drift;

    // subtle bending
    float bend =
        sin(uTime * 0.8 + position.y * 1.5) * 0.04;

    pos.x += bend * (position.y * 0.5);

    // world position approximation
    vec3 worldPos = pos;

    // distance from cursor
    float dist = distance(worldPos.xy, uMouse.xy);

    // influence falloff
    float influence =
        smoothstep(uRadius, 0.0, dist);

    // direction away from cursor
    vec2 dir =
        normalize(worldPos.xy - uMouse.xy);

    // apply subtle repulsion
    pos.xy += dir * influence * 0.3;

    vec4 mvPosition =
        modelViewMatrix * vec4(pos, 1.0);

    vDepth = -mvPosition.z;
    vOrganic = breath + drift + bend + influence;

    gl_Position =
        projectionMatrix * mvPosition;
}
