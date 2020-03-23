import glslangModule from "@webgpu/glslang/dist/web-devel/glslang.js";
import * as Comlink from "comlink";
import { writable, derived } from "svelte/store";

const cache = {};

const vertexShaderGLSL = `#version 450
const vec2 pos[3] = vec2[3](vec2(0.0f, 0.5f), vec2(-0.5f, -0.5f), vec2(0.5f, -0.5f));
void main() {
    gl_Position = vec4(pos[gl_VertexIndex], 0.0, 1.0);
}
`;

const fragmentShaderGLSL = `#version 450
layout(location = 0) out vec4 outColor;
void main() {
    outColor = vec4(1.0, 0.0, 0.0, 1.0);
}
`;

const adapter = writable();
const glslang = writable();

navigator.gpu.requestAdapter().then($adapter => {
  adapter.set($adapter);
});

const device = derived(adapter, ($adapter, set) => {
  if ($adapter)
    $adapter.requestDevice().then(device => set(device));
});

glslangModule.default().then(module => glslang.set(module));

const canvas = writable();

const context = derived(canvas, $canvas => {
  if ($canvas)
    return $canvas.getContext('gpupresent');
});

const swapChainFormat = "bgra8unorm";

const swapChain = derived(
  [context, device],
  ($context, $device) => {
    if ($context && $device)
      return context.configureSwapChain({
        device,
        format: swapChainFormat
      });
});

const pipeline = derived(
  [device, glslang],
  ($device, $glslang) => {
    if ($device && $glslang) {
      return device.createRenderPipeline({
        layout: $device.createPipelineLayout({ bindGroupLayouts: [] }),

        vertexStage: {
          module: $device.createShaderModule({
            code: $glslang.compileGLSL(vertexShaderGLSL, "vertex"),
            source: vertexShaderGLSL,
            transform: source => glslang.compileGLSL(source, "vertex"),
          }),
          entryPoint: "main"
        },

        fragmentStage: {
          module: $device.createShaderModule({
            code: $glslang.compileGLSL(fragmentShaderGLSL, "fragment"),
            source: fragmentShaderGLSL,
            transform: source => glslang.compileGLSL(source, "fragment"),
          }),
          entryPoint: "main"
        },

        primitiveTopology: "triangle-list",

        colorStates: [{
          format: swapChainFormat,
        }],
      });
    }
  }
);

device.subscribe($device => cache.device = $device);
swapChain.subscribe($swapChain => cache.swapChain = $swapChain);
pipeline.subscribe($pipeline => cache.pipeline = $pipeline);

function frame() {
  if (!cache.device || !cache.swapChain || !cache.pipeline)
    return;

  const commandEncoder = cache.device.createCommandEncoder({});

  const textureView = cache.swapChain.getCurrentTexture().createView();

  const renderPassDescriptor = {
    colorAttachments: [{
      attachment: textureView,
      loadValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
    }],
  };

  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

  passEncoder.setPipeline(cache.pipeline);
  passEncoder.draw(3, 1, 0, 0);
  passEncoder.endPass();

  cache.device.defaultQueue.submit([commandEncoder.finish()]);
}

const ready = derived(
  [device, swapChain, pipeline],
  ($device, $swapChain, $pipeline) => {
    if ($device, $swapChain, $pipeline)
      return true;
  }
)

const helloTriangle = {
  canvas,
  frame,
  ready
};

Comlink.expose(helloTriangle);