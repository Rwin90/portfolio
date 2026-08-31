import glsl from "vite-plugin-glsl";

export default {
  plugins: [glsl()],
   server: {
    port: 9090,
    host: "0.0.0.0",
    fs: {
      strict: false,
    },
  },
    base: "/",
};
