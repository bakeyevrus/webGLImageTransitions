
class Sketch {
  constructor(opts) {
    this.scene = new THREE.Scene();
    this.vertex = `varying vec2 vUv;void main() {vUv = uv;gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );}`;
    this.fragment = opts.fragment;
    this.uniforms = opts.uniforms;
    this.renderer = new THREE.WebGLRenderer({ alpha: true });
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0x000000, 0);
    this.duration = opts.duration || 1;
    this.debug = opts.debug || false
    this.easing = opts.easing || 'easeInOut'
    this.container = document.getElementById(opts.containerId);
    this.images = JSON.parse(this.container.getAttribute('data-images'));
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.001,
      1000
    );

    this.camera.position.set(0, 0, 2);
    this.time = 0;
    this.current = 0;
    this.textures = [];

    this.paused = true;
    this.initiate(() => {
      this.addListeners();
      this.settings();
      this.addObjects();
      this.resize();
      this.play();
    })



  }

  initiate(cb) {
    var _this = this;
    var manager = new THREE.LoadingManager();
    var imgLoader = new THREE.TextureLoader(manager);
    imgLoader.setCrossOrigin('Anonymous');

    manager.onLoad = function () {
      cb();
    }

    this.images.forEach((url, i) => {
      imgLoader.load(url, function (img) {
        _this.textures[i] = img;
        _this.textures[i].minFilter = THREE.LinearFilter;
      });
    });
  }

  settings() {
    let that = this;
    if (this.debug) this.gui = new dat.GUI();
    this.settings = { progress: 0.5 };
    // if(this.debug) this.gui.add(this.settings, "progress", 0, 1, 0.01);

    Object.keys(this.uniforms).forEach((item) => {
      this.settings[item] = this.uniforms[item].value;
      if (this.debug) this.gui.add(this.settings, item, this.uniforms[item].min, this.uniforms[item].max, 0.01);
    })
  }

  addListeners() {
    window.addEventListener("resize", this.resize.bind(this));
  }

  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;


    // image cover
    this.imageAspect = this.textures[0].image.height / this.textures[0].image.width;
    let a1; let a2;
    if (this.height / this.width > this.imageAspect) {
      a1 = (this.width / this.height) * this.imageAspect;
      a2 = 1;
    } else {
      a1 = 1;
      a2 = (this.height / this.width) / this.imageAspect;
    }

    this.material.uniforms.resolution.value.x = this.width;
    this.material.uniforms.resolution.value.y = this.height;
    this.material.uniforms.resolution.value.z = a1;
    this.material.uniforms.resolution.value.w = a2;

    const dist = this.camera.position.z;
    const height = 1;
    this.camera.fov = 2 * (180 / Math.PI) * Math.atan(height / (2 * dist));

    this.plane.scale.x = this.camera.aspect;
    this.plane.scale.y = 1;

    this.camera.updateProjectionMatrix();


  }

  addObjects() {
    let that = this;
    this.material = new THREE.ShaderMaterial({
      extensions: {
        derivatives: "#extension GL_OES_standard_derivatives : enable"
      },
      side: THREE.DoubleSide,
      uniforms: {
        time: { type: "f", value: 0 },
        progress: { type: "f", value: 0 },
        border: { type: "f", value: 0 },
        intensity: { type: "f", value: 0 },
        scaleX: { type: "f", value: 40 },
        scaleY: { type: "f", value: 40 },
        transition: { type: "f", value: 40 },
        swipe: { type: "f", value: 0 },
        width: { type: "f", value: 0 },
        radius: { type: "f", value: 0 },
        texture1: { type: "f", value: this.textures[0] },
        texture2: { type: "f", value: this.textures[1] },
        displacement: { type: "f", value: new THREE.TextureLoader().load('img/disp1.jpg') },
        resolution: { type: "v4", value: new THREE.Vector4() },
      },
      // wireframe: true,
      vertexShader: this.vertex,
      fragmentShader: this.fragment
    });

    this.geometry = new THREE.PlaneGeometry(1, 1, 2, 2);

    this.plane = new THREE.Mesh(this.geometry, this.material);
    // this.plane.rotation.z = - 90 * Math.PI / 180;
    this.scene.add(this.plane);
  }

  stop() {
    this.paused = true;
  }

  play() {
    this.paused = false;
    this.render();
  }

  next() {
    if (this.isRunning) return;
    this.isRunning = true;
    let len = this.textures.length;
    let nextTexture = this.textures[(this.current + 1) % len];
    this.material.uniforms.texture2.value = nextTexture;
    let tl = new TimelineMax();
    tl.to(this.material.uniforms.progress, this.duration, {
      value: 1,
      ease: Power2[this.easing],
      onComplete: () => {
        console.log('FINISH');
        this.current = (this.current + 1) % len;
        this.material.uniforms.texture1.value = nextTexture;
        this.material.uniforms.progress.value = 0;
        this.isRunning = false;
      }
    })
  }
  render() {
    if (this.paused) return;
    // this.time += 0.05;
    // this.material.uniforms.time.value = this.time;
    this.material.uniforms.progress.value = this.progress;
    Object.keys(this.uniforms).forEach((item) => {
      this.material.uniforms[item].value = this.settings[item];
    });

    // this.camera.position.z = 3;
    // this.plane.rotation.y = 0.4*Math.sin(this.time)
    // this.plane.rotation.x = 0.5*Math.sin(0.4*this.time)

    requestAnimationFrame(this.render.bind(this));
    this.renderer.render(this.scene, this.camera);
  }
}

// New code
var trackedEl = document.getElementById('portfolio');
var trackedElOffset;
var trackedLength;
var documentHeight;

var ticking = false;

function getDocHeight() {
  var doc = document;
  return Math.max(
    doc.body.scrollHeight, doc.documentElement.scrollHeight,
    doc.body.offsetHeight, doc.documentElement.offsetHeight,
    doc.body.clientHeight, doc.documentElement.clientHeight
  );
}

function getMeasurements() {
  documentHeight = getDocHeight();
  trackedElOffset = trackedEl.offsetTop;
  trackedLength = trackedEl.getBoundingClientRect().height;

}

function requestTick() {
  if (!ticking) {
    requestAnimationFrame(update);
    ticking = true;
  }
}

function update() {
  var scrollTop = window.pageYOffset || (document.documentElement || document.body.parentNode || document.body).scrollTop;
  var percentageScrolled;
  if (scrollTop < trackedElOffset) {
    percentageScrolled = 0;
    ticking = false;
    return;
  } else if (scrollTop > trackedElOffset + trackedLength) {
    percentageScrolled = 100;
    ticking = false;
    return;
  } else {
    percentageScrolled = (scrollTop - trackedElOffset) / trackedLength * 100;
  }

  var progress = THREE.Math.mapLinear(percentageScrolled, 0, 33, 0, 1);
  if (progress < 1) {
    sketch.material.uniforms.texture1.value = sketch.textures[0];
    sketch.material.uniforms.texture2.value = sketch.textures[1];

  } else if (progress >= 1 && progress < 2) {
    sketch.material.uniforms.texture1.value = sketch.textures[1];
    sketch.material.uniforms.texture2.value = sketch.textures[2];

    progress -= 1;
  } else {
    progress = undefined;
  }

  if (progress != null) {
    sketch.progress = progress;
  } else {
    sketch.progress = 1;
  }

  ticking = false;
}

getMeasurements();
window.addEventListener('scroll', requestTick, false);
window.addEventListener("resize", function () {
  getMeasurements();
  update();
}, false);

