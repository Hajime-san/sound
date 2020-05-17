import * as THREE from 'three';
// import { OrbitControls } from 'three/examples/js/controls/OrbitControls';
import { GPUComputationRenderer, GPUComputationRendererVariable } from 'gpucomputationrender-three';

const WIDTH = 500;
const PARTICLES = WIDTH * WIDTH;

let renderer: any,
    renderTarget: any,
    geometry: any,
    scene: any,
    camera: any,
    container: any,
    controls: any;

let gpuCompute: GPUComputationRenderer;

let particleUniforms: any,
    positionVariable: GPUComputationRendererVariable,
    velocityVariable: GPUComputationRendererVariable,
    anglesVariable: GPUComputationRendererVariable,
    velocityUniforms: any,
    anglesUniforms: any,
    effectController: any;



export const init = () => {
  container = document.getElementById( 'sound' ) as HTMLElement;
  document.body.appendChild( container );
  camera = new THREE.PerspectiveCamera( 100, window.innerWidth / window.innerHeight, 5, 15000 );
  camera.position.y = 0;
  camera.position.z = 150;
  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer();
  renderer.setClearColor( 0x000000 );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  container.appendChild( renderer.domElement );
  // controls = new OrbitControls( camera, renderer.domElement );
  window.addEventListener( 'resize', onWindowResize, false );

  // Can be changed dynamically
  effectController = {
    volume: 0.0,
    ambient: [1.0,  0.0,  0.0]
  }

  initComputeRenderer();

  initPosition();

}

export function initComputeRenderer() {

  gpuCompute = new GPUComputationRenderer( WIDTH, WIDTH, renderer );


  const dtPosition = gpuCompute.createTexture();
  const dtVelocity = gpuCompute.createTexture();
  const dtAngles = gpuCompute.createTexture();

  fillTextures(dtPosition, dtVelocity, dtAngles);

  velocityVariable = gpuCompute.addVariable( "textureVelocity", computeShaderVelocity(), dtVelocity );
  positionVariable = gpuCompute.addVariable( "texturePosition", computeShaderPosition(), dtPosition );
  anglesVariable = gpuCompute.addVariable( "textureAngles", setParticlesAngle(), dtAngles );

  gpuCompute.setVariableDependencies( velocityVariable, [ positionVariable, velocityVariable, anglesVariable ] );
  gpuCompute.setVariableDependencies( positionVariable, [ positionVariable, velocityVariable, anglesVariable ]  );
  gpuCompute.setVariableDependencies( anglesVariable, [ positionVariable, velocityVariable, anglesVariable ]  );

  velocityUniforms = velocityVariable.material.uniforms;
  anglesUniforms = anglesVariable.material.uniforms;

  velocityUniforms.volume = { value: 0.0 };
  velocityUniforms.ambient = {
    value: [1.0,  0.0,  0.0]
  };

  const error = gpuCompute.init();


  if (error !== null) {
    console.error(error);
  }

}

export function initPosition() {

  geometry = new THREE.BufferGeometry();
  const positions = new Float32Array( PARTICLES * 3 );
  let p = 0;
  for ( let i = 0; i < PARTICLES; i++ ) {
      positions[ p++ ] = 0;
      positions[ p++ ] = 0;
      positions[ p++ ] = 0;
  }

  const uvs = new Float32Array( PARTICLES * 2 );
  p = 0;
  for ( let j = 0; j < WIDTH; j++ ) {
      for ( let i = 0; i < WIDTH; i++ ) {
          uvs[ p++ ] = i / ( WIDTH - 1 );
          uvs[ p++ ] = j / ( WIDTH - 1 );
      }
  }


  geometry.addAttribute('position', new THREE.BufferAttribute( positions, 3 ) );
  geometry.addAttribute('uv', new THREE.BufferAttribute( uvs, 2 ) );

  particleUniforms = {
    texturePosition: { value: null },
    textureVelocity: { value: null },
    cameraConstant: { value: getCameraConstant( camera ) },
    ambient: {
      value: [0.0, 0.0, 0.0]
    }
  };

  const material = new THREE.ShaderMaterial( {
      uniforms:       particleUniforms,
      vertexShader:   particleVertexShader(),
      fragmentShader: particleFragmentShader()
  });
  material.extensions.drawBuffers = true;
  const particles = new THREE.Points( geometry, material );
  particles.matrixAutoUpdate = false;
  particles.updateMatrix();

  scene.add( particles );

}

function getCameraConstant( camera: any) {
  return window.innerHeight / ( Math.tan( THREE.Math.DEG2RAD * 0.5 * camera.fov ) / camera.zoom );
}

function fillTextures( texturePosition:  any, textureVelocity:  any, angleArray: any) {

  const posArray = texturePosition.image.data;
  const velArray = textureVelocity.image.data;
  const angArr = angleArray.image.data;

  const radius = 50;

  const RADIAN = Math.PI / 180;

  for ( let k = 0, i = 0, kl = posArray.length; k < kl; k += 4, i++) {
    // angles
    const phi = 360 * Math.random() * RADIAN;
    const theta = (180 * Math.random() - 90) * RADIAN;

    // Position
    let x, y, z;
    x = radius * Math.cos(theta) * Math.sin(phi);
		y = radius * Math.sin(theta);
		z = radius * Math.cos(theta) * Math.cos(phi);

    posArray[ k + 0 ] = x;
    posArray[ k + 1 ] = y;
    posArray[ k + 2 ] = z;
    posArray[ k + 3 ] = i;

    velArray[ k + 0 ] = 0;
    velArray[ k + 1 ] = 0;
    velArray[ k + 2 ] = 0;
    velArray[ k + 3 ] = 0;

    angArr[ k + 0 ] = phi;
    angArr[ k + 1 ] = theta;
    angArr[ k + 2 ] = 0;
    angArr[ k + 3 ] = 0;

  }

}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
  particleUniforms.cameraConstant.value = getCameraConstant( camera );
}

export function animate() {

  gpuCompute.compute();

  particleUniforms.texturePosition.value = gpuCompute.getCurrentRenderTarget( positionVariable ).texture;
  particleUniforms.textureVelocity.value = gpuCompute.getCurrentRenderTarget( velocityVariable ).texture;
  renderer.render( scene, camera );
}

export function dynamicValuesChanger(currentScale: any, volume: number) {
  velocityUniforms.volume.value = volume;


  if(currentScale.pitch.indexOf('C') !== -1) {
    particleUniforms.ambient.value = {
      r: 227,
      g: 33,
      b: 30
    }
  } else if (currentScale.pitch.indexOf('D') !== -1) {
    particleUniforms.ambient.value = {
      r: 218,
      g: 177,
      b: 28
    }
  } else if (currentScale.pitch.indexOf('E') !== -1) {
    particleUniforms.ambient.value = {
      r: 62,
      g: 169,
      b: 53
    }
  } else if (currentScale.pitch.indexOf('F') !== -1) {
    particleUniforms.ambient.value = {
      r: 188,
      g: 131,
      b: 63
    }
  } else if (currentScale.pitch.indexOf('G') !== -1) {
    particleUniforms.ambient.value = {
      r: 2,
      g: 175,
      b: 205
    }
  } else if (currentScale.pitch.indexOf('A') !== -1) {
    particleUniforms.ambient.value = {
      r: 185,
      g: 86,
      b: 133
    }
  } else if (currentScale.pitch.indexOf('B') !== -1) {
    particleUniforms.ambient.value = {
      r: 218,
      g: 162,
      b: 175
    }
  }

}

function setParticlesAngle() {
  return `
    // save original angles per particle
    void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec4 angleData = texture2D( textureAngles, uv );
        vec2 angles = angleData.xy;
        float phi = angleData.x;
        float theta = angleData.y;

        gl_FragColor = vec4(phi, theta, 0.0, 0.0);
    }
  `
}

function computeShaderPosition() {
  return `
    void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec4 tmpPos = texture2D( texturePosition, uv );
        vec3 pos = tmpPos.xyz;
        float index = tmpPos.w;
        vec4 tmpVel = texture2D( textureVelocity, uv );
        vec3 vel = tmpVel.xyz;

        // update
        pos = vel;

        gl_FragColor = vec4(pos, index);
    }
  `
}

function computeShaderVelocity() {
  return `
    #include <common>

    uniform float volume;

    //
    // Description : Array and textureless GLSL 2D/3D/4D simplex
    //               noise functions.
    //      Author : Ian McEwan, Ashima Arts.
    //  Maintainer : stegu
    //     Lastmod : 20110822 (ijm)
    //     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
    //               Distributed under the MIT License. See LICENSE file.
    //               https://github.com/ashima/webgl-noise
    //               https://github.com/stegu/webgl-noise
    //

    vec3 mod289(vec3 x) {
      return x - floor(x * (1.0 / 289.0)) * 289.0;
    }

    vec4 mod289(vec4 x) {
      return x - floor(x * (1.0 / 289.0)) * 289.0;
    }

    vec4 permute(vec4 x) {
        return mod289(((x*34.0)+1.0)*x);
    }

    vec4 taylorInvSqrt(vec4 r)
    {
      return 1.79284291400159 - 0.85373472095314 * r;
    }

    float snoise(vec3 v)
      {
      const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 =   v - i + dot(i, C.xxx) ;

    // Other corners
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );

      //   x0 = x0 - 0.0 + 0.0 * C.xxx;
      //   x1 = x0 - i1  + 1.0 * C.xxx;
      //   x2 = x0 - i2  + 2.0 * C.xxx;
      //   x3 = x0 - 1.0 + 3.0 * C.xxx;
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
      vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

    // Permutations
      i = mod289(i);
      vec4 p = permute( permute( permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    // Gradients: 7x7 points over a square, mapped onto an octahedron.
    // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
      float n_ = 0.142857142857; // 1.0/7.0
      vec3  ns = n_ * D.wyz - D.xzx;

      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);

      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );

      //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
      //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));

      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);

    //Normalise gradients
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;

    // Mix final noise value
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                    dot(p2,x2), dot(p3,x3) ) );
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / resolution.xy;
      float idParticle = uv.y * resolution.x + uv.x;
      vec4 tmpPos = texture2D( texturePosition, uv );
      vec3 pos = tmpPos.xyz;
      vec4 tmpVel = texture2D( textureVelocity, uv );
      vec3 vel = tmpVel.xyz;

      vec4 angleData = texture2D( textureAngles, uv );
      vec2 angles = angleData.xy;
      float phi = angleData.x;
      float theta = angleData.y;

      // update sphere with volume as radius
      vel.x = volume * cos(theta) * sin(phi);
      vel.y = volume * sin(theta);
      vel.z = volume * cos(theta) * cos(phi);

      gl_FragColor = vec4( vel, 0.0 );
    }
  `
}

function particleVertexShader() {
  return `
    #include <common>
    uniform sampler2D texturePosition;
    uniform float cameraConstant;
    uniform vec3 ambient;
    varying vec4 vColor;

    vec3 colorConvert(vec3 c) {
      c.r = c.r / 255.0;
      c.g = c.g / 255.0;
      c.b = c.b / 255.0;
      return c;
    }

    void main() {
        vec4 posTemp = texture2D( texturePosition, uv );
        vec3 pos = posTemp.xyz;
        vec3 currentScale = ambient;
        vColor = vec4( colorConvert(currentScale), 1.0 );

        vec4 mvPosition = modelViewMatrix * vec4( pos, 1.0 );
        gl_PointSize = 0.5 * cameraConstant / ( - mvPosition.z );

        gl_Position = projectionMatrix * mvPosition;
    }
  `
}

function particleFragmentShader() {
  return `
    varying vec4 vColor;

    void main() {
        // point shape to a circle
        float f = length( gl_PointCoord - vec2( 0.5, 0.5 ) );
        if ( f > 0.1 ) {
            discard;
        }
        gl_FragColor = vColor;
    }
  `
}
