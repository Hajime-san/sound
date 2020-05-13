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
    positionUniforms: any,
    velocityUniforms: any,
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

  fillTextures( dtPosition, dtVelocity, volume );

  velocityVariable = gpuCompute.addVariable( "textureVelocity", computeShaderVelocity(), dtVelocity );
  positionVariable = gpuCompute.addVariable( "texturePosition", computeShaderPosition(), dtPosition );

  gpuCompute.setVariableDependencies( velocityVariable, [ positionVariable, velocityVariable ] );
  gpuCompute.setVariableDependencies( positionVariable, [ positionVariable, velocityVariable ] );


  positionUniforms = positionVariable.material.uniforms;
  velocityUniforms = velocityVariable.material.uniforms;

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

  // var line = new THREE.Line( geometry, mat );
  // line.matrixAutoUpdate = false;
  // line.updateMatrix();
  // scene.add( line );

}

function getCameraConstant( camera: any) {
  return window.innerHeight / ( Math.tan( THREE.Math.DEG2RAD * 0.5 * camera.fov ) / camera.zoom );
}

function fillTextures( texturePosition:  any, textureVelocity:  any, volume: number ) {

  const posArray = texturePosition.image.data;
  const velArray = textureVelocity.image.data;

  const getRandomInt = (min, max) =>  Math.floor(Math.random() * (max - min)) + min;

  const radius = 100;

  for ( let k = 0, kl = posArray.length; k < kl; k += 4 ) {
    const rad = getRandomInt(0, 360);
    const rad2 = getRandomInt(0, 360);
      // Position
      let x, y, z;
      x = Math.cos(rad) * Math.cos(rad2) * radius;
      y = Math.cos(rad) * Math.sin(rad2) * radius;
      z = Math.sin(rad) * radius;

      posArray[ k + 0 ] = x;
      posArray[ k + 1 ] = y;
      posArray[ k + 2 ] = z;
      posArray[ k + 3 ] = 0;

      velArray[ k + 0 ] = Math.random();
      velArray[ k + 1 ] = Math.random();
      velArray[ k + 2 ] = Math.random();
      velArray[ k + 3 ] = Math.random();
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
    #define delta ( 1.0 / 600.0 )

    uniform float volume;

    void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec4 tmpPos = texture2D( texturePosition, uv );
        vec4 pos = vec4(tmpPos.xyz, volume);
        vec4 tmpVel = texture2D( textureVelocity, uv );
        vec4 vel = vec4(tmpVel.xyz, volume);

        // float move = 0.0;

        // if(pos.w < vel.w) {
        //   move = 1.0 / 60.0;
        //   pos += vec4(vel.x * move, vel.y * move, vel.z * move, volume);
        // } else {
        //   move = -(1.0 / 60.0);
        //   pos += vec4(vel.x * move, vel.y * move, vel.z * move, volume);
        // }

        pos += vel * delta;

        // Dynamics

        gl_FragColor = pos;
    }
  `
}

function computeShaderVelocity() {
  return `
    #include <common>

    uniform float volume;

    //const float PI = 3.1415926535897932384626433832795;

    void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        float idParticle = uv.y * resolution.x + uv.x;
        vec4 tmpVel = texture2D( textureVelocity, uv );
        vec3 vel = tmpVel.xyz;

        float rad = mod(tmpVel.w , 360.0) * 3.1415926535897932384626433832795 / 180.0;
        float t = cos(rad);
        vel.x = 0.0;
        vel.x = 0.0;
        vel.x = 0.0;
        // vel.x = cos(rad) * cos(rad2) * rad;
        // vel.y = cos(rad) * sin(rad2) * rad;
        // vel.z = sin(rad) * rad;

        gl_FragColor = vec4( vel, 1.0 );
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
