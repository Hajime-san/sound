import * as frequencyToScaleData from '../frequencyToScale';
import * as THREE from 'three';
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

let starGeometry: any,
    starMaterial: any,
    gpuCompute: GPUComputationRenderer;

let particleUniforms: any,
    positionVariable: GPUComputationRendererVariable,
    velocityVariable: GPUComputationRendererVariable,
    anglePhiVariable: GPUComputationRendererVariable,
    angleThetaVariable: GPUComputationRendererVariable,
    positionUniforms: any,
    velocityUniforms: any,
    anglePhiUniforms: any,
    angleThetaUniforms: any,
    effectController: any;



export const init = () => {
  // renderer = new THREE.WebGLRenderer();
  // scene = new THREE.Scene();
  // camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
  // container = document.getElementById('sound') as HTMLElement;

  // renderer.setSize( window.innerWidth, window.innerHeight );
  // container.appendChild( renderer.domElement );

  // const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
  // directionalLight.position.set( 0, 1, 1 );
  // scene.add(directionalLight);

  // const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.3);
  // scene.add(ambientLight);

  // camera.position.z = 5;

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
  // controls = new THREE.OrbitControls( camera, renderer.domElement );
  window.addEventListener( 'resize', onWindowResize, false );

  // const geometry = new THREE.SphereGeometry( 1, 32, 32 );
  // const material = new THREE.MeshStandardMaterial( { color: 0x969696, roughness: 0.5 } );
  // const sphere = new THREE.Mesh( geometry, material );
  // scene.add( sphere );

  // starGeometry = new THREE.Geometry();

  // for(let i = 0; i < 6000; i++) {
  //   const star: any = new THREE.Vector3(
  //     Math.random() * 600 - 300,
  //     Math.random() * 600 - 300,
  //     Math.random() * 600 - 300
  //   );
  //   star.velocity = 0;
  //   star.acceleration = bpm * 0.0001;
  //   starGeometry.vertices.push(star);
  // }

  // starMaterial = new THREE.PointsMaterial({
  //   size: 0.5,
  //   color: 0xFFFFFF,
  // });

  // const mesh = new THREE.Points(starGeometry, starMaterial);
  // scene.add(mesh);

  // Can be changed dynamically
  effectController = {
    volume: 0.0,
    ambient: {
      r: 0,
      g: 0,
      b: 0
    }
  }

  // initComputeRenderer();

  // initPosition();

}

export function initComputeRenderer(normalizedHz: any, volume: number) {

  gpuCompute = new GPUComputationRenderer( WIDTH, WIDTH, renderer );


  const dtPosition = gpuCompute.createTexture();
  const dtVelocity = gpuCompute.createTexture();
  const phiAngles = gpuCompute.createTexture();
  const thetaAngles = gpuCompute.createTexture();

  fillTextures( dtPosition, dtVelocity, phiAngles, thetaAngles, volume );

  velocityVariable = gpuCompute.addVariable( "textureVelocity", computeShaderVelocity(), dtVelocity );
  positionVariable = gpuCompute.addVariable( "texturePosition", computeShaderPosition(), dtPosition );
  anglePhiVariable = gpuCompute.addVariable( "anglePhi", computeShaderVelocity(), phiAngles );
  angleThetaVariable = gpuCompute.addVariable( "angleTheta", computeShaderVelocity(), thetaAngles );

  gpuCompute.setVariableDependencies( velocityVariable, [ positionVariable, velocityVariable ] );
  gpuCompute.setVariableDependencies( positionVariable, [ positionVariable, velocityVariable ] );
  gpuCompute.setVariableDependencies( anglePhiVariable, [ positionVariable, velocityVariable ] );
  gpuCompute.setVariableDependencies( angleThetaVariable, [ positionVariable, velocityVariable ] );

  positionUniforms = positionVariable.material.uniforms;
  velocityUniforms = velocityVariable.material.uniforms;
  anglePhiUniforms = anglePhiVariable.material.uniforms;
  angleThetaUniforms = angleThetaVariable.material.uniforms;

  velocityUniforms.volume = { value: volume };
  velocityUniforms.ambient = {
    value: {
      r: 0,
      g: 0,
      b: 0
    }
  };

  const error = gpuCompute.init();


  if (error !== null) {
    console.error(error);
  }

}

export function initPosition(volume: number) {

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
        value: {
          r: 0,
          g: 0,
          b: 0
        }
      }
  };

  const mat = new THREE.ShaderMaterial( {
      uniforms:       particleUniforms,
      vertexShader:   particleVertexShader(),
      fragmentShader: particleFragmentShader()
  });
  mat.extensions.drawBuffers = true;
  const particles = new THREE.Points( geometry, mat );
  particles.matrixAutoUpdate = false;
  particles.updateMatrix();

  scene.add( particles );

}

function getCameraConstant( camera: any) {
  return window.innerHeight / ( Math.tan( THREE.Math.DEG2RAD * 0.5 * camera.fov ) / camera.zoom );
}

function fillTextures( texturePosition:  any, textureVelocity:  any, textureAnglePhi: any, textureAngleTheta: any, volume: number ) {

  const posArray = texturePosition.image.data;
  const velArray = textureVelocity.image.data;
  const phiArr = textureAnglePhi.image.data;
  const thetaArr = textureAngleTheta.image.data;

  const getRandomInt = (min, max) =>  Math.floor(Math.random() * (max - min)) + min;

  const radius = 100;

  for ( let k = 0, i = 0, kl = posArray.length; k < kl; k += 4, i++) {
    const phi = getRandomInt(0, 360);
    const theta = getRandomInt(0, 360);
    // Position
    let x, y, z;
    x = Math.cos(phi) * Math.cos(theta) * radius;
    y = Math.cos(phi) * Math.sin(theta) * radius;
    z = Math.sin(phi) * radius;

    posArray[ k + 0 ] = x;
    posArray[ k + 1 ] = y;
    posArray[ k + 2 ] = z;
    posArray[ k + 3 ] = i;

    velArray[ k + 0 ] = Math.random();
    velArray[ k + 1 ] = Math.random();
    velArray[ k + 2 ] = Math.random();
    velArray[ k + 3 ] = 0;

    phiArr[ k + 0 ] = phi;
    phiArr[ k + 1 ] = 0;
    phiArr[ k + 2 ] = 0;
    phiArr[ k + 3 ] = 0;

    thetaArr[ k + 0 ] = theta;
    thetaArr[ k + 1 ] = 0;
    thetaArr[ k + 2 ] = 0;
    thetaArr[ k + 3 ] = 0;
  }

}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
  particleUniforms.cameraConstant.value = getCameraConstant( camera );
}

const tickStar = (currentScale: frequencyToScaleData.PitchName, volume: number) => {

  starGeometry.vertices.forEach((p: any) => {
    p.velocity += p.acceleration;
    p.z -= p.velocity;

    p.x -= volume * 0.01 + 0.2;
    p.y -= volume * 0.01 + 0.2;

    if (p.z < -200) {
      p.x = Math.random() * 600 - 300,
      p.y = Math.random() * 600 - 300,
      p.z = 200;
      p.velocity = 0;
    }
  });
  starGeometry.verticesNeedUpdate = true;

  starMaterial.size = volume * 0.02;

  if(currentScale.pitch.indexOf('C') !== -1) {
    starMaterial.color.set(0xff2d2d)
  } else if (currentScale.pitch.indexOf('D') !== -1) {
    starMaterial.color.set(0xFCAF22)
  } else if (currentScale.pitch.indexOf('E') !== -1) {
    starMaterial.color.set(0xECE130)
  } else if (currentScale.pitch.indexOf('F') !== -1) {
    starMaterial.color.set(0x33cc00)
  } else if (currentScale.pitch.indexOf('G') !== -1) {
    starMaterial.color.set(0x00ccff)
  } else if (currentScale.pitch.indexOf('A') !== -1) {
    starMaterial.color.set(0xE22FAA)
  } else if (currentScale.pitch.indexOf('B') !== -1) {
    starMaterial.color.set(0xffffff)
  }

}


export function animate(currentScale: any, volume: number) {

  gpuCompute.compute();

  particleUniforms.texturePosition.value = gpuCompute.getCurrentRenderTarget( positionVariable ).texture;
  particleUniforms.textureVelocity.value = gpuCompute.getCurrentRenderTarget( velocityVariable ).texture;
  renderer.render( scene, camera );
}

export function dynamicValuesChanger(currentScale: any, volume: number) {
  velocityUniforms[ 'volume' ].value = volume;
  // particleUniforms.ambient.value = normalizedHz;

  if(currentScale.pitch.indexOf('C') !== -1) {
    particleUniforms.ambient.value = {
      r: 0,
      g: 1.0,
      b: 0.59
    }
  } else if (currentScale.pitch.indexOf('D') !== -1) {
    particleUniforms.ambient.value = {
      r: 0.11,
      g: 0.97,
      b: 0.56
    }
  } else if (currentScale.pitch.indexOf('E') !== -1) {
    particleUniforms.ambient.value = {
      r: 0.16,
      g: 0.83,
      b: 0.56
    }
  } else if (currentScale.pitch.indexOf('F') !== -1) {
    particleUniforms.ambient.value = {
      r: 0.29,
      g: 1.0,
      b: 0.4
    }
  } else if (currentScale.pitch.indexOf('G') !== -1) {
    particleUniforms.ambient.value = {
      r: 0.53,
      g: 1.0,
      b: 0.5
    }
  } else if (currentScale.pitch.indexOf('A') !== -1) {
    particleUniforms.ambient.value = {
      r: 0.89,
      g: 0.76,
      b: 0.54
    }
  } else if (currentScale.pitch.indexOf('B') !== -1) {
    particleUniforms.ambient.value = {
      r: 1.0,
      g: 1.0,
      b: 1.0
    }
  }
}

// export const animate = (currentScale: frequencyToScaleData.PitchName, volume: number) => {
  // sphere.rotation.x += 0.01;
  // sphere.rotation.z += 0.01;

  // camera.rotation.z -= 0.01;

  // tickStar(currentScale, volume);

  // renderer.render( scene, camera );

//};

function computeShaderPosition() {
  return `
    #define delta ( 1.0 / 1.0 )

    uniform float volume;

    varying vec2 vUv;

    void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec4 tmpPos = texture2D( texturePosition, uv );
        vec3 pos = tmpPos.xyz;
        vec4 tmpVel = texture2D( textureVelocity, uv );
        vec3 vel = tmpVel.xyz;

        // Dynamics
        pos += vel;

        gl_FragColor = vec4(pos, tmpPos.w);
    }
  `
}

function computeShaderVelocity() {
  return `
    #include <common>

    uniform sampler2D anglePhi;
    uniform sampler2D angleTheta;

    uniform float volume;

    varying vec2 vUv;

    //const float PI = 3.14159265358979;

    void main() {


        vec2 uv = gl_FragCoord.xy / resolution.xy;
        float idParticle = uv.y * resolution.x + uv.x;
        vec4 tmpPos = texture2D( texturePosition, uv );
        vec3 pos = tmpPos.xyz;
        vec4 tmpVel = texture2D( textureVelocity, uv );
        vec3 vel = tmpVel.xyz;
        vec4 phiAngle = texture2D( anglePhi, uv );
        float phi = phiAngle.x;
        vec4 thetaAngle = texture2D( angleTheta, uv );
        float theta = thetaAngle.x;
        float index = tmpPos.w;

        // float t = cos(index);
        // pos.x = pos.x + pos.x * t;
        // pos.y = pos.y + pos.y * t;
        // pos.z = pos.z + pos.z * t;
        // vel -= pos;

        float p = pos.x * PI / 180.0;
        float t = ((pos.y - 180.0) * PI) / 180.0;

        vel.x = sin(-volume * cos(p) * cos(t));
        vel.y = sin(volume * sin(p));
        vel.z = sin(volume * cos(p) * sin(t));

        gl_FragColor = vec4( vel, tmpPos.w );
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
    varying vec2 vUv;

    void main() {
        vec4 posTemp = texture2D( texturePosition, uv );
        vec3 pos = posTemp.xyz;
        vColor = vec4( ambient.r, ambient.g, ambient.b, 1.0 );

        vec4 mvPosition = modelViewMatrix * vec4( pos, 1.0 );
        gl_PointSize = 0.5 * cameraConstant / ( - mvPosition.z );

        vUv = uv;

        gl_Position = projectionMatrix * mvPosition;
    }
  `
}

function particleFragmentShader() {
  return `
    varying vec4 vColor;
    void main() {
        float f = length( gl_PointCoord - vec2( 0.5, 0.5 ) );
        if ( f > 0.1 ) {
            discard;
        }
        gl_FragColor = vColor;
    }
  `
}
