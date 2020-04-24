import {
  generateRandomSpeed,
  generateRandomXPosition,
  drawKeypoints,
  draw3DHand,
  moveHands,
} from "./utils.js";
const fruits = [];
const fruitsObjects = [];
const hands = [];
let scene;
let fruit;
let speed;
let sound;
let camera;
let handMesh;
let renderer;
let net;
let canvas = document.getElementById("output");
let ctx = canvas.getContext("2d");
let video;
let fruitModel;
const videoWidth = window.innerWidth;
const videoHeight = window.innerHeight;

navigator.getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;

const fruitsModels = [
  { model: "banana/Banana_01", material: "banana/Banana_01", name: "banana" },
  { model: "apple/Apple", material: "apple/Apple", name: "apple" },
];

const guiState = {
  algorithm: "single-pose",
  input: {
    mobileNetArchitecture: "0.75",
    outputStride: 16,
    imageScaleFactor: 0.5,
  },
  singlePoseDetection: {
    minPoseConfidence: 0.1,
    minPartConfidence: 0.5,
  },
  output: {
    showVideo: false,
    showPoints: true,
  },
  net: null,
};

const generateFruits = () => {
  for (var i = 0; i < 10; i++) {
    const randomFruit = fruits[generateRandomXPosition(0, 1)];
    const randomXPosition = generateRandomXPosition(-1000, 1000);
    const randomYPosition = generateRandomXPosition(-850, -800);
    // const randomYPosition = 500;

    let newFruit = randomFruit.clone();

    newFruit.position.x = randomXPosition;
    newFruit.position.y = randomYPosition;
    newFruit.position.z = 1000;

    // newFruit.rotation.set(-7.5, 2.5, -5);
    // newFruit.scale.set(0.005, 0.005, 0.005);

    // if (randomFruit.name === "apple") {
    //   newFruit.scale.set(0.005, 0.005, 0.005);
    // } else {
    //   newFruit.scale.set(0.015, 0.015, 0.015);
    // }

    if (randomFruit.name === "apple") {
      newFruit.position.z = -300;
    }

    speed = 10;
    // speed = 0.05;
    newFruit.speed = speed;
    newFruit.soundPlayed = false;
    newFruit.direction = "up";
    fruitsObjects.push(newFruit);

    scene.add(newFruit);
    renderer.render(scene, camera);
  }
};

const setupLights = () => {
  let ambientLight = new THREE.AmbientLight(
    new THREE.Color("rgb(255,255,255)")
  );
  ambientLight.position.set(10, 0, 50);
  scene.add(ambientLight);

  let spotLight = new THREE.SpotLight(0xffffff);
  spotLight.position.set(10, 0, 50);
  spotLight.castShadow = true;
  scene.add(spotLight);
};

const setupCamera = async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
      "Browser API navigator.mediaDevices.getUserMedia not available"
    );
  }

  const video = document.getElementById("video");
  video.width = videoWidth;
  video.height = videoHeight;

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
      width: videoWidth,
      height: videoHeight,
    },
  });
  video.srcObject = stream;

  return new Promise(
    (resolve) => (video.onloadedmetadata = () => resolve(video))
  );
};

const loadVideo = async () => {
  const video = await setupCamera();
  video.play();

  return video;
};

const detectPoseInRealTime = (video, net) => {
  // since images are being fed from a webcam
  const flipHorizontal = false;

  canvas.width = videoWidth;
  canvas.height = videoHeight;

  async function poseDetectionFrame() {
    // Scale an image down to a certain factor. Too large of an image will slow
    // down the GPU
    const imageScaleFactor = guiState.input.imageScaleFactor;
    const outputStride = +guiState.input.outputStride;

    let poses = [];
    let minPoseConfidence;
    let minPartConfidence;
    switch (guiState.algorithm) {
      case "single-pose":
        const pose = await guiState.net.estimateSinglePose(
          video,
          imageScaleFactor,
          flipHorizontal,
          outputStride
        );
        poses.push(pose);

        minPoseConfidence = +guiState.singlePoseDetection.minPoseConfidence;
        minPartConfidence = +guiState.singlePoseDetection.minPartConfidence;
        break;
    }

    ctx.clearRect(0, 0, videoWidth, videoHeight);

    poses.forEach(({ score, keypoints }) => {
      if (score >= minPoseConfidence) {
        if (guiState.output.showPoints) {
          const leftWrist = keypoints.find((k) => k.part === "leftWrist");
          const rightWrist = keypoints.find((k) => k.part === "rightWrist");

          // drawKeypoints([rightWrist, leftWrist], minPartConfidence, ctx);

          if (leftWrist) {
            const hasLeftHand = hands.find((hand) => hand.name === "leftHand");

            if (!hasLeftHand) {
              handMesh = draw3DHand();
              hands.push({
                mesh: handMesh,
                coordinates: leftWrist.position,
                name: "leftHand",
              });
              scene.add(handMesh);
            }

            const leftHandIndex = hands.findIndex(
              (hand) => hand.name === "leftHand"
            );

            leftHandIndex !== -1 &&
              (hands[leftHandIndex].coordinates = leftWrist.position);
          }

          if (rightWrist) {
            const hasRightHand = hands.find(
              (hand) => hand.name === "rightHand"
            );

            if (!hasRightHand) {
              handMesh = draw3DHand();
              hands.push({
                mesh: handMesh,
                coordinates: rightWrist.position,
                name: "rightHand",
              });
              scene.add(handMesh);
            }
            const rightHandIndex = hands.findIndex(
              (hand) => hand.name === "rightHand"
            );

            rightHandIndex !== -1 &&
              (hands[rightHandIndex].coordinates = rightWrist.position);
          }

          // moveHands(hands, camera, fruitsObjects);
        }
      }
    });
    requestAnimationFrame(poseDetectionFrame);
  }

  poseDetectionFrame();
};

const animate = () => {
  requestAnimationFrame(animate);
  // detectPoseInRealTime(video, net);

  if (fruitsObjects) {
    fruitsObjects.map((fruit, index) => {
      // fruit.rotation.x += 0.02;
      // fruit.rotation.y += 0.02;

      if (fruit.direction === "up") {
        fruit.position.y += fruit.speed;
      }
      if (
        fruit.position.y > -700 &&
        !fruit.soundPlayed &&
        fruit.direction === "up"
      ) {
        sound.play();
        fruit.soundPlayed = true;
      }
      if (fruit.position.y > 500) {
        fruit.direction = "down";
      }
      if (fruit.direction === "down") {
        fruit.position.y -= fruit.speed;
      }

      if (fruit.position.y < -900) {
        scene.remove(fruit);
        fruitsObjects.splice(index, 1);
      }
    });
    if (fruitsObjects.length === 0) {
      fruit && (fruit.direction = "up");
      fruit && generateFruits();
    }
  }
  // window.onmousemove = (e) => {
  //   const mouseVector = new THREE.Vector2();

  //   mouseVector.x = (e.clientX / window.innerWidth) * 2 - 1;
  //   // mouseVector.y = -(e.clientY / window.innerHeight) * 2 + 1;
  //   mouseVector.y = -(e.clientY / window.innerHeight) * 2 + 1;

  //   const raycaster = new THREE.Raycaster();
  //   raycaster.setFromCamera(mouseVector, camera);

  //   // let intersects = raycaster.intersectObjects(fruits, true);
  //   let intersects = raycaster.intersectObjects(fruitsObjects, true);

  //   if (intersects.length > 0) {
  //     if (
  //       intersects[0].object.name === "banana" ||
  //       intersects[0].object.name === "apple"
  //     ) {
  //       const fruit = intersects[0].object;
  //       console.log("touched a fruit!!");
  //     }
  //   }
  // };

  window.onmousemove = (e) => {
    if (hands) {
      moveHands(hands, camera, fruitsObjects, e);
    }
  };

  if (hands.length) {
    moveHands(hands, camera, fruitsObjects);
  }

  renderer.render(scene, camera);
};

const updateStartButton = () => {
  document.getElementsByTagName("button")[0].innerText = "Start";
  document.getElementsByTagName("button")[0].disabled = false;
};

const loadPoseNet = async () => {
  net = await posenet.load({
    architecture: "MobileNetV1",
    outputStride: 16,
    inputResolution: 513,
    multiplier: 0.75,
  });

  try {
    video = await loadVideo();
  } catch (e) {
    throw e;
  }

  guiState.net = net;
};

const loadFruitsModels = () => {
  return fruitsModels.map((fruit) => {
    var mtlLoader = new THREE.MTLLoader();
    mtlLoader.setPath("assets/");
    mtlLoader.load(`${fruit.material}.mtl`, function (materials) {
      materials.preload();

      var objLoader = new THREE.OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.setPath("assets/");
      objLoader.load(`${fruit.model}.obj`, function (object) {
        object.traverse(function (child) {
          if (child instanceof THREE.Mesh) {
            var mesh = new THREE.Mesh(child.geometry, child.material);

            fruitModel = mesh;
            fruitModel.name = fruit.name;

            // if (fruitModel.name === "apple") {
            //   fruitModel.scale.set(0.005, 0.005, 0.005);
            // } else {
            //   fruitModel.scale.set(0.015, 0.015, 0.015);
            // }

            fruits.push(fruitModel);
          }
        });

        // fruitModel = object;
        // fruitModel.name = fruit.name;
        // fruits.push(fruitModel);
      });
    });
    return fruits;
  });
};

const init3DScene = async () => {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  // camera.position.z = 5;
  camera.position.z = 500;

  renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementsByClassName("game")[0].appendChild(renderer.domElement);

  setupLights();
};

window.onload = async () => {
  sound = new Howl({ src: ["fruit.m4a"] });
  await loadPoseNet();
  await init3DScene();
  loadFruitsModels();

  updateStartButton();
};

document.getElementsByTagName("button")[0].onclick = () => {
  if (net) {
    document.getElementsByClassName("intro")[0].style.display = "none";
    generateFruits();

    // startDetectingHands();
    animate();
    detectPoseInRealTime(video, net);
  }
};
