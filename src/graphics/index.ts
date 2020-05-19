import * as THREE from 'three';
// import { OrbitControls } from 'three/examples/js/controls/OrbitControls';
import { GPUComputationRenderer, GPUComputationRendererVariable } from 'gpucomputationrender-three';

const WIDTH = 256;
const PARTICLES = WIDTH * WIDTH;

let renderer: any,
    renderTarget: any,
    geometry: any,
    scene: any,
    camera: any,
    container: any,
    controls: any,
    rot: number,
    time: number,
    delta: any;

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
  rot = 0;
  time = 0;
  delta = new THREE.Clock();
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
  velocityUniforms.time = { value: 0.0 };

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
  time += delta.getDelta();
  velocityUniforms.time.value = time;

  rot += 0.5;
  const radian = (rot * Math.PI) / 180;
  camera.position.x = 150 * Math.sin(radian);
  camera.position.z = 150 * Math.cos(radian);
  camera.lookAt(new THREE.Vector3(0, 0, 0));

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
    uniform float time;

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

    vec4 mod289(vec4 x) {
      return x - floor(x * (1.0 / 289.0)) * 289.0; }

    float mod289(float x) {
      return x - floor(x * (1.0 / 289.0)) * 289.0; }

    vec4 permute(vec4 x) {
        return mod289(((x*34.0)+1.0)*x);
    }

    float permute(float x) {
        return mod289(((x*34.0)+1.0)*x);
    }

    vec4 taylorInvSqrt(vec4 r)
    {
      return 1.79284291400159 - 0.85373472095314 * r;
    }

    float taylorInvSqrt(float r)
    {
      return 1.79284291400159 - 0.85373472095314 * r;
    }

    vec4 grad4(float j, vec4 ip)
      {
      const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
      vec4 p,s;

      p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
      p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
      s = vec4(lessThan(p, vec4(0.0)));
      p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;

      return p;
      }

    // (sqrt(5) - 1)/4 = F4, used once below
    #define F4 0.309016994374947451

    float snoise(vec4 v)
      {
      const vec4  C = vec4( 0.138196601125011,  // (5 - sqrt(5))/20  G4
                            0.276393202250021,  // 2 * G4
                            0.414589803375032,  // 3 * G4
                          -0.447213595499958); // -1 + 4 * G4

    // First corner
      vec4 i  = floor(v + dot(v, vec4(F4)) );
      vec4 x0 = v -   i + dot(i, C.xxxx);

    // Other corners

    // Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)
      vec4 i0;
      vec3 isX = step( x0.yzw, x0.xxx );
      vec3 isYZ = step( x0.zww, x0.yyz );
    //  i0.x = dot( isX, vec3( 1.0 ) );
      i0.x = isX.x + isX.y + isX.z;
      i0.yzw = 1.0 - isX;
    //  i0.y += dot( isYZ.xy, vec2( 1.0 ) );
      i0.y += isYZ.x + isYZ.y;
      i0.zw += 1.0 - isYZ.xy;
      i0.z += isYZ.z;
      i0.w += 1.0 - isYZ.z;

      // i0 now contains the unique values 0,1,2,3 in each channel
      vec4 i3 = clamp( i0, 0.0, 1.0 );
      vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
      vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );

      //  x0 = x0 - 0.0 + 0.0 * C.xxxx
      //  x1 = x0 - i1  + 1.0 * C.xxxx
      //  x2 = x0 - i2  + 2.0 * C.xxxx
      //  x3 = x0 - i3  + 3.0 * C.xxxx
      //  x4 = x0 - 1.0 + 4.0 * C.xxxx
      vec4 x1 = x0 - i1 + C.xxxx;
      vec4 x2 = x0 - i2 + C.yyyy;
      vec4 x3 = x0 - i3 + C.zzzz;
      vec4 x4 = x0 + C.wwww;

    // Permutations
      i = mod289(i);
      float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
      vec4 j1 = permute( permute( permute( permute (
                i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
              + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
              + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
              + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));

    // Gradients: 7x7x6 points over a cube, mapped onto a 4-cross polytope
    // 7*7*6 = 294, which is close to the ring size 17*17 = 289.
      vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;

      vec4 p0 = grad4(j0,   ip);
      vec4 p1 = grad4(j1.x, ip);
      vec4 p2 = grad4(j1.y, ip);
      vec4 p3 = grad4(j1.z, ip);
      vec4 p4 = grad4(j1.w, ip);

    // Normalise gradients
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      p4 *= taylorInvSqrt(dot(p4,p4));

    // Mix contributions from the five corners
    vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
    vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
    m0 = m0 * m0;
    m1 = m1 * m1;
    return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))
                + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;

    }

    float RestirictedRandom(float min, float max, vec2 p) {
      return min + floor(rand(p) * (max - min + 1.0));
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / resolution.xy;
      vec4 tmpPos = texture2D( texturePosition, uv );
      vec3 pos = tmpPos.xyz;
      float index = tmpPos.w;

      vec4 tmpVel = texture2D( textureVelocity, uv );
      vec3 vel = tmpVel.xyz;

      vec4 angleData = texture2D( textureAngles, uv );
      vec2 angles = angleData.xy;
      float phi = angleData.x;
      float theta = angleData.y;

      float r = rand(gl_FragCoord.xy);

      float random = RestirictedRandom(volume - 10.0 * r, volume + 10.0 * r, gl_FragCoord.xy);

      // update sphere with volume as radius
      vec3 newPos = vec3(0.0);
      newPos.x = (volume * (2.0 * snoise( vec4( 0.1 * newPos.xyz, 7.225 + 0.5 * time ) ))) * cos(theta) * sin(phi);
      newPos.y = (volume * (2.0 * snoise( vec4( 0.1 * newPos.xyz, 1.035 + 0.5 * time ) )))  * sin(theta);
      newPos.z = (volume * (2.0 * snoise( vec4( 0.1 * newPos.xyz, 3.669 + 0.5 * time ) )))  * cos(theta) * cos(phi);

      vel = newPos;

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
