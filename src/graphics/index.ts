import * as frequencyToScaleData from '../frequencyToScale';
import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer(),
      scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

let starGeometry: THREE.Geometry,
    starMaterial: THREE.PointsMaterial;


export const init = (bpm: number) => {
  const canvas = document.getElementById('sound') as HTMLElement;

  renderer.setSize( window.innerWidth, window.innerHeight );
  canvas.appendChild( renderer.domElement );

  const geometry = new THREE.SphereGeometry( 1, 32, 32 );
  const material = new THREE.MeshStandardMaterial( { color: 0x969696, roughness: 0.5 } );
  const sphere = new THREE.Mesh( geometry, material );
  scene.add( sphere );

  starGeometry = new THREE.Geometry();

  for(let i = 0; i < 6000; i++) {
    const star: any = new THREE.Vector3(
      Math.random() * 600 - 300,
      Math.random() * 600 - 300,
      Math.random() * 600 - 300
    );
    star.velocity = 0;
    star.acceleration = bpm * 0.0001;
    starGeometry.vertices.push(star);
  }

  starMaterial = new THREE.PointsMaterial({
    size: 0.5,
    color: 0xFFFFFF,
  });

  // class CustomSinCurve extends THREE.Curve<THREE.Vector3> {
  //   scale: any;
  //   constructor(scale: any) {
  //     super();
  //     this.scale = scale;
  //   }
  //   getPoint(t: any) {
  //     const tx = t * 3 - 1.5;
  //     const ty = Math.sin(1.5 * Math.PI * t);
  //     const tz = 0;
  //     return new THREE.Vector3(tx, ty, tz).multiplyScalar(this.scale);
  //   }
  // }

  // const path = new CustomSinCurve(10);

  // geometry

  // const lineGeometry = new THREE.TubeBufferGeometry( path, 30, 1, 30, false );

  // lineGeometry.scale(0.3,0.3,0.3);

  // var lineMaterial = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
  // var lineMesh = new THREE.Mesh( lineGeometry, lineMaterial );
  // scene.add( lineMesh );

  const mesh = new THREE.Points(starGeometry, starMaterial);
  scene.add(mesh);
}

//const tubeLength = lineGeometry.parameters.path.getLengths().length;

const tickStar = (currentScale: frequencyToScaleData.PitchName, volume: number) => {

  // for (let index = 0; index < tubeLength; index++) {
  //   const beforeX = lineGeometry.parameters.path.getPoint(index).x;
  //   lineGeometry.parameters.path.getPoint(index).setX(analyze.volume * beforeX * 0.01);
  // }

  starGeometry.vertices.forEach((p: any, i) => {
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


const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
directionalLight.position.set( 0, 1, 1 );
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.3);
scene.add(ambientLight);

camera.position.z = 5;

export const animate = (currentScale: frequencyToScaleData.PitchName, volume: number) => {
  // sphere.rotation.x += 0.01;
  // sphere.rotation.z += 0.01;

  camera.rotation.z -= 0.01;

  tickStar(currentScale, volume);

  renderer.render( scene, camera );

};
