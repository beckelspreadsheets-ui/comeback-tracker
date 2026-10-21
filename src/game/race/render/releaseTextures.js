// Texture teardown for a renderer that is about to go away.
//
// A WebGLRenderer hangs a 'dispose' listener on every texture it uploads, and
// that listener closes over the renderer. The listener only removes itself
// when the TEXTURE is disposed — renderer.dispose() does not touch it. So any
// texture that outlives a renderer keeps that whole renderer reachable: its
// programs, uniforms, texture handles and the context wrapper.
//
// Textures that outlive a race or a menu stage:
// - three's own module-level singletons, handed to every renderer in the page:
//   r184's DFG lookup table that every PBR material samples (getDFGLUT,
//   'DFG_LUT'). It is not on the material — it sits in the renderer's own
//   per-material uniforms — which is why this reads renderer.properties.
// - our module-level textures (the particles' soft dot, …) and the maps of
//   cached GLB models that the next race or stage reuses.
// Measured 2026-10-21 (heap trace across quit-to-menu cycles): one race's
// renderer, ~0.6 MiB of JS heap, kept per race played, plus one per menu visit.
//
// Disposing a shared texture is safe: a renderer that is still alive simply
// re-uploads it on its next draw. Render-target textures are left alone; they
// belong to their render targets, which are disposed with their owners.
//
// Call collectRendererTextures BEFORE renderer.dispose() (which forgets the
// per-material uniforms), and dispose the returned set after it.
export const collectRendererTextures = (renderer, scene) => {
  const textures = new Set();
  const add = (value) => {
    if (value?.isTexture && !value.isRenderTargetTexture) textures.add(value);
  };
  const addUniforms = (uniforms) => {
    Object.values(uniforms || {}).forEach((uniform) => add(uniform?.value));
  };
  scene?.traverse?.((object) => {
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (!material) return;
      Object.values(material).forEach(add);
      addUniforms(material.uniforms);
      addUniforms(renderer?.properties?.get(material)?.uniforms);
    });
  });
  if (scene) {
    add(scene.background);
    add(scene.environment);
  }
  return textures;
};

export const disposeTextures = (textures) => {
  textures.forEach((texture) => texture.dispose());
};
