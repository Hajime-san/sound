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

  //const tubeLength = lineGeometry.parameters.path.getLengths().length;

  // for (let index = 0; index < tubeLength; index++) {
  //   const beforeX = lineGeometry.parameters.path.getPoint(index).x;
  //   lineGeometry.parameters.path.getPoint(index).setX(analyze.volume * beforeX * 0.01);
  // }
