// Demo-only stand-in for the guest's camera feed: a lit room and the host phone, drawn from the
// same pose and projection the effect receives. The phone's screen shows the live host canvas, so
// the window the host draws is seen the way a camera at that place would see it, and the guest's
// sheets can be judged against the glass they come out of.
import {
  BoxGeometry, CanvasTexture, Group, LinearMipmapLinearFilter, Matrix4, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry,
  Scene, SRGBColorSpace, WebGLRenderer,
} from "three";

export class FakeCamera {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(60, 1, 0.05, 200);
  private readonly phone = new Group();
  private readonly screen: CanvasTexture;
  private readonly m = new Matrix4();

  constructor(private readonly canvas: HTMLCanvasElement, hostCanvas: HTMLCanvasElement, cardH: number) {
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setClearColor(0x000000, 0);
    this.screen = new CanvasTexture(hostCanvas);
    this.screen.colorSpace = SRGBColorSpace;
    // a camera integrates the light of every screen pixel it covers: the screen is minified with mipmaps
    this.screen.minFilter = LinearMipmapLinearFilter;
    this.screen.generateMipmaps = true;
    this.screen.anisotropy = 8;
    const body = new Mesh(new BoxGeometry(1.07, cardH + 0.07, 0.12), new MeshBasicMaterial({ color: 0x15171b }));
    body.position.z = -0.065;
    const bezel = new Mesh(new PlaneGeometry(1.035, cardH + 0.035), new MeshBasicMaterial({ color: 0x050607 }));
    bezel.position.z = -0.004;
    const glass = new Mesh(new PlaneGeometry(1, cardH), new MeshBasicMaterial({ map: this.screen, toneMapped: false }));
    this.phone.add(body, bezel, glass);
    this.phone.matrixAutoUpdate = false;
    this.scene.add(this.phone);
  }

  setProjection(fovY: number, aspect: number): void {
    this.camera.fov = fovY;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Pose of the card plane in camera space, or null to look at the empty room. */
  setPose(m: Float32Array | null): void {
    this.phone.visible = !!m;
    if (m) {
      this.phone.matrix.copy(this.m.fromArray(m));
      this.phone.matrixWorldNeedsUpdate = true;
    }
  }

  render(): void {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight, pr = Math.min(2, window.devicePixelRatio || 1);
    if (this.canvas.width !== Math.round(w * pr) || this.canvas.height !== Math.round(h * pr)) {
      this.renderer.setPixelRatio(pr);
      this.renderer.setSize(w, h, false);
    }
    this.screen.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.screen.dispose();
    this.renderer.dispose();
  }
}
