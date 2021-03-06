import {
  NormalBlending,
  UniformsUtils,
  ShaderMaterial,
  Scene,
  OrthographicCamera,
  PlaneBufferGeometry,
  Mesh,
} from 'three';
import ComposerPass from 'graphics/ComposerPass';

export default class ShaderPass extends ComposerPass {
  static defaultProperties = {
    textureId: 'tDiffuse',
    transparent: false,
    needsSwap: true,
    forceClear: false,
    blending: NormalBlending,
  };

  constructor(shader, properties) {
    super({ ...ShaderPass.defaultProperties, ...properties });

    this.uniforms = UniformsUtils.clone(shader.uniforms);

    this.material = new ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      defines: shader.defines || {},
      transparent: this.properties.transparent,
      blending: this.properties.blending,
    });

    this.scene = new Scene();
    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.geometry = new PlaneBufferGeometry(2, 2);

    this.mesh = new Mesh(this.geometry, null);
    this.mesh.material = this.material;
    this.mesh.frustumCulled = false;

    this.scene.add(this.mesh);
  }

  setUniforms(props) {
    const { uniforms } = this;

    Object.keys(props).forEach(prop => {
      if (Object.prototype.hasOwnProperty.call(uniforms, prop)) {
        const p = uniforms[prop].value;

        if (p !== null && p.set) {
          p.set(...props[prop]);
        } else {
          uniforms[prop].value = props[prop];
        }
      }
    });

    this.material.needsUpdate = true;
  }

  render(renderer, writeBuffer, readBuffer) {
    const { scene, camera, material } = this;
    const { textureId } = this.properties;

    if (readBuffer && material.uniforms[textureId]) {
      material.uniforms[textureId].value = readBuffer.texture;
    }

    super.render(renderer, scene, camera, writeBuffer);
  }
}
