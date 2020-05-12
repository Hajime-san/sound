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
    velocityVariable: GPUComputationRendererVariable;



export const init = (bpm: number) => {
  // renderer = new THREE.WebGLRenderer();
  // scene = new THREE.Scene();
  // camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
  // container = document.getElementById('sound') as HTMLElement;

  // renderer.setSize( window.innerWidth, window.innerHeight );
  // container.appendChild( renderer.domElement );

  // controls = new OrbitControls( camera, renderer.domElement );

  // const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
  // directionalLight.position.set( 0, 1, 1 );
  // scene.add(directionalLight);

  // const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.3);
  // scene.add(ambientLight);

  // camera.position.z = 5;

  container = document.getElementById( 'sound' ) as HTMLElement;
  document.body.appendChild( container );
  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 5, 15000 );
  camera.position.y = 120;
  camera.position.z = 200;
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

  // ①gpuCopute用のRenderを作る
  initComputeRenderer();

  // ②particle 初期化
  initPosition();

}

function initComputeRenderer() {

  gpuCompute = new GPUComputationRenderer( WIDTH, WIDTH, renderer );


  const dtPosition = gpuCompute.createTexture();
  const dtVelocity = gpuCompute.createTexture();

  fillTextures( dtPosition, dtVelocity );

  // shaderプログラムのアタッチ
  velocityVariable = gpuCompute.addVariable( "textureVelocity", computeShaderVelocity(), dtVelocity );
  positionVariable = gpuCompute.addVariable( "texturePosition", computeShaderPosition(), dtPosition );

  // 一連の関係性を構築するためのおまじない
  gpuCompute.setVariableDependencies( velocityVariable, [ positionVariable, velocityVariable ] );
  gpuCompute.setVariableDependencies( positionVariable, [ positionVariable, velocityVariable ] );


  const error = gpuCompute.init();


  if (error !== null) {
    console.error(error);
  }

}

function initPosition() {

  // 最終的に計算された結果を反映するためのオブジェクト。
  // 位置情報はShader側(texturePosition, textureVelocity)
  // で決定されるので、以下のように適当にうめちゃってOK

  geometry = new THREE.BufferGeometry();
  var positions = new Float32Array( PARTICLES * 3 );
  var p = 0;
  for ( var i = 0; i < PARTICLES; i++ ) {
      positions[ p++ ] = 0;
      positions[ p++ ] = 0;
      positions[ p++ ] = 0;
  }

  // uv情報の決定。テクスチャから情報を取り出すときに必要
  var uvs = new Float32Array( PARTICLES * 2 );
  p = 0;
  for ( var j = 0; j < WIDTH; j++ ) {
      for ( var i = 0; i < WIDTH; i++ ) {
          uvs[ p++ ] = i / ( WIDTH - 1 );
          uvs[ p++ ] = j / ( WIDTH - 1 );
      }
  }

  // attributeをgeoに登録する
  geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
  geometry.addAttribute( 'uv', new THREE.BufferAttribute( uvs, 2 ) );


  // uniform変数をオブジェクトで定義
  // 今回はカメラをマウスでいじれるように、計算に必要な情報もわたす。
  particleUniforms = {
      texturePosition: { value: null },
      textureVelocity: { value: null },
      cameraConstant: { value: getCameraConstant( camera ) }
  };

  // Shaderマテリアル これはパーティクルそのものの描写に必要なシェーダー
  const mat = new THREE.ShaderMaterial( {
      uniforms:       particleUniforms,
      vertexShader:   particleVertexShader(),
      fragmentShader: particleFragmentShader()
  });
  mat.extensions.drawBuffers = true;
  const particles = new THREE.Points( geometry, mat );
  particles.matrixAutoUpdate = false;
  particles.updateMatrix();

  // パーティクルをシーンに追加
  scene.add( particles );

}

function getCameraConstant( camera: any) {
  return window.innerHeight / ( Math.tan( THREE.Math.DEG2RAD * 0.5 * camera.fov ) / camera.zoom );
}

function fillTextures( texturePosition:  any, textureVelocity:  any ) {

  // textureのイメージデータをいったん取り出す
  var posArray = texturePosition.image.data;
  var velArray = textureVelocity.image.data;

  // パーティクルの初期の位置は、ランダムなXZに平面おく。
  // 板状の正方形が描かれる

  for ( var k = 0, kl = posArray.length; k < kl; k += 4 ) {
      // Position
      var x, y, z;
      x = Math.random()*500-250;
      z = Math.random()*500-250;
      y = 0;
      // posArrayの実態は一次元配列なので
      // x,y,z,wの順番に埋めていく。
      // wは今回は使用しないが、配列の順番などを埋めておくといろいろ使えて便利
      posArray[ k + 0 ] = x;
      posArray[ k + 1 ] = y;
      posArray[ k + 2 ] = z;
      posArray[ k + 3 ] = 0;

      // 移動する方向はとりあえずランダムに決めてみる。
      // これでランダムな方向にとぶパーティクルが出来上がるはず。
      velArray[ k + 0 ] = Math.random()*2-1;
      velArray[ k + 1 ] = Math.random()*2-1;
      velArray[ k + 2 ] = Math.random()*2-1;
      velArray[ k + 3 ] = Math.random()*2-1;
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


export function animate(currentScale: frequencyToScaleData.PitchName, volume: number) {

  // 計算用のテクスチャを更新
  gpuCompute.compute();

  // 計算した結果が格納されたテクスチャをレンダリング用のシェーダーに渡す
  particleUniforms.texturePosition.value = gpuCompute.getCurrentRenderTarget( positionVariable ).texture;
  particleUniforms.textureVelocity.value = gpuCompute.getCurrentRenderTarget( velocityVariable ).texture;
  renderer.render( scene, camera );

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
    #define delta ( 1.0 / 60.0 )
    void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec4 tmpPos = texture2D( texturePosition, uv );
        vec3 pos = tmpPos.xyz;
        vec4 tmpVel = texture2D( textureVelocity, uv );
        vec3 vel = tmpVel.xyz;

        pos += vel * delta;
        gl_FragColor = vec4( pos, 1.0 );
    }
  `
}

function computeShaderVelocity() {
  return `
    #include <common>

    void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        float idParticle = uv.y * resolution.x + uv.x;
        vec4 tmpVel = texture2D( textureVelocity, uv );
        vec3 vel = tmpVel.xyz;

        gl_FragColor = vec4( vel.xyz, 1.0 );
    }
  `
}

function particleVertexShader() {
  return `
    #include <common>
    uniform sampler2D texturePosition;
    uniform float cameraConstant;
    uniform float density;
    varying vec4 vColor;
    varying vec2 vUv;
    uniform float radius;

    void main() {
        vec4 posTemp = texture2D( texturePosition, uv );
        vec3 pos = posTemp.xyz;
        vColor = vec4( 1.0, 0.7, 1.0, 1.0 );

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
