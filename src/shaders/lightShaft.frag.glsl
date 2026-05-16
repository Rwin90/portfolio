precision highp float;

uniform vec3 uColor;

varying float vDepth;
varying float vOrganic;

void main() {

    float verticalFade =
        smoothstep(0.0, 0.2, gl_FragCoord.y / 1000.0);

    float depthFade =
        smoothstep(80.0, 0.0, vDepth);

    float organicPulse =
        0.85 + vOrganic * 0.4;

    float alpha =
        verticalFade *
        depthFade *
        0.18 *
        organicPulse;

    gl_FragColor =
        vec4(uColor, alpha);

}
