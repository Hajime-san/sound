import * as BPM from './bpm';
import * as Scale from './scale';
import * as THREE from 'three';


document.addEventListener('DOMContentLoaded', async ()=>{

    const context = new AudioContext();

    const bpm = await BPM.analyzeAverageBMPthroughSong(context, './assets/cyborg.mp3');

    const analyze = new Scale.Analyze(context);

    await analyze.analyzeScaleFromAudioFile('./assets/cyborg.mp3', 0);


    // // await analyze.analyzeScaleFromMediaStream();

    const pitchElement = document.getElementById('pitch') as HTMLElement;
    const hzElement = document.getElementById('hz') as HTMLElement;
    const volumeElement = document.getElementById('volume') as HTMLElement;
    const bpmElement = document.getElementById('bpm') as HTMLElement;

    const tick = () => {
      pitchElement.textContent = `${analyze.currentScale.pitch}`;
      hzElement.textContent = `${analyze.currentScale.Hz}`;
      volumeElement.textContent = `${analyze.volume}`;
      bpmElement.textContent = `${bpm}`
      requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick);

    const canvas = document.getElementById('sound') as HTMLElement;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    canvas.appendChild( renderer.domElement );

    const geometry = new THREE.SphereGeometry( 1, 32, 32 );
    const material = new THREE.MeshStandardMaterial( { color: 0x969696, roughness: 0.5 } );
    const sphere = new THREE.Mesh( geometry, material );
    scene.add( sphere );

    const starGeo = new THREE.Geometry();
    for(let i = 0; i < 6000; i++) {
      const star: any = new THREE.Vector3(
        Math.random() * 600 - 300,
        Math.random() * 600 - 300,
        Math.random() * 600 - 300
      );
      star.velocity = 0;
      star.acceleration = bpm * 0.0001;
      starGeo.vertices.push(star);
    }

    const starMaterial = new THREE.PointsMaterial({
      size: 0.5,
      color: 0xFFFFFF,
    });

    const mesh = new THREE.Points(starGeo, starMaterial);
    scene.add(mesh);

    const tickStar = () => {
      starGeo.vertices.forEach((p: any, i) => {
        p.velocity += p.acceleration
        p.z -= p.velocity;

        if (p.z < -200) {
          p.z = 200;
          p.velocity = 0;
        }
      });
      starGeo.verticesNeedUpdate = true

      starMaterial.size = analyze.volume * 0.02;

      if(analyze.currentScale.pitch.indexOf('C') !== -1) {
        starMaterial.color.set(0xff2d2d)
      } else if (analyze.currentScale.pitch.indexOf('D') !== -1) {
        starMaterial.color.set(0xFCAF22)
      } else if (analyze.currentScale.pitch.indexOf('E') !== -1) {
        starMaterial.color.set(0xECE130)
      } else if (analyze.currentScale.pitch.indexOf('F') !== -1) {
        starMaterial.color.set(0x33cc00)
      } else if (analyze.currentScale.pitch.indexOf('G') !== -1) {
        starMaterial.color.set(0x00ccff)
      } else if (analyze.currentScale.pitch.indexOf('A') !== -1) {
        starMaterial.color.set(0xE22FAA)
      } else if (analyze.currentScale.pitch.indexOf('B') !== -1) {
        starMaterial.color.set(0xffffff)
      }
    }


    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
    directionalLight.position.set( 0, 1, 1 );
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.3);
    scene.add(ambientLight);

    camera.position.z = 5;

    const animate = () => {
      // sphere.rotation.x += 0.01;
      // sphere.rotation.z += 0.01;

      camera.rotation.z -= 0.01;

      tickStar();

      renderer.render( scene, camera );

      requestAnimationFrame( animate );
    };

    animate();
})
