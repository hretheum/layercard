// Demo-only stand-in for the guest's camera feed: a lit room at room scale, a host figure holding
// the phone, and the phone itself, all drawn from the same pose and projection the effect receives.
// The phone screen shows the live host canvas, so the anchored spill can be judged against what it
// is supposed to pour out of. Everything is in card units (card width 1 = 7 cm): the floor lies
// 1.25 m below the phone, the back wall 2 m behind it, floor tiles are 30 cm.
import {
  BoxGeometry, CanvasTexture, CylinderGeometry, DoubleSide, Group, LinearFilter, LinearMipmapLinearFilter, Matrix4, Mesh,
  MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, RepeatWrapping, Scene, SphereGeometry, SRGBColorSpace, Vector3,
  WebGLRenderer, type BufferGeometry, type Material, type Texture,
} from "three";

export const CM = 1 / 7;
const FLOOR_Y = -125 * CM;
const CEIL_Y = 120 * CM;
const BACK_Z = -200 * CM;
const SIDE_X = 190 * CM;

function tiles(a: string, b: string, line: string): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d")!;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    x.fillStyle = (i + j) % 2 ? a : b;
    x.fillRect(i * 128, j * 128, 128, 128);
  }
  x.strokeStyle = line;
  x.lineWidth = 3;
  for (let i = 0; i <= 2; i++) {
    x.beginPath(); x.moveTo(i * 128, 0); x.lineTo(i * 128, 256); x.stroke();
    x.beginPath(); x.moveTo(0, i * 128); x.lineTo(256, i * 128); x.stroke();
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.minFilter = LinearMipmapLinearFilter;
  t.anisotropy = 8;
  return t;
}

export class FakeCamera {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(60, 1, 0.05, 400);
  /** everything that is fixed to the host phone: the phone, the host figure and the room */
  private readonly world = new Group();
  private readonly phone = new Group();
  private readonly host = new Group();
  private readonly screen: CanvasTexture;
  private readonly m = new Matrix4();
  private readonly geos: BufferGeometry[] = [];
  private readonly mats: Material[] = [];
  private readonly texs: Texture[] = [];
  /** the room as seen when no pose is given: the same room, the phone and its holder gone */
  private readonly emptyPose = new Matrix4().makeRotationX(0.07).setPosition(new Vector3(0, -0.4, -6.7));

  constructor(private readonly canvas: HTMLCanvasElement, hostCanvas: HTMLCanvasElement, cardH: number) {
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setClearColor(0xe9e6df, 1);
    this.screen = new CanvasTexture(hostCanvas);
    this.screen.colorSpace = SRGBColorSpace;
    this.screen.minFilter = LinearFilter;
    this.screen.generateMipmaps = false;

    const flat = (color: number, map?: Texture): MeshBasicMaterial => {
      const m = new MeshBasicMaterial({ color, map, side: DoubleSide });
      this.mats.push(m);
      return m;
    };
    const add = (parent: Group, g: BufferGeometry, m: Material, x = 0, y = 0, z = 0): Mesh => {
      this.geos.push(g);
      const mesh = new Mesh(g, m);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    };

    // the phone: body, bezel, live screen
    add(this.phone, new BoxGeometry(1.07, cardH + 0.07, 0.12), flat(0x15171b), 0, 0, -0.065);
    add(this.phone, new PlaneGeometry(1.035, cardH + 0.035), flat(0x050607), 0, 0, -0.004);
    const glass = new MeshBasicMaterial({ map: this.screen, toneMapped: false });
    this.mats.push(glass);
    add(this.phone, new PlaneGeometry(1, cardH), glass);

    // the host: a plain figure 35 cm behind the phone, head at 1.65 m, one forearm reaching the phone
    const skin = flat(0xc9ccd1), cloth = flat(0xa3a9b2), trousers = flat(0x7d848e);
    add(this.host, new SphereGeometry(1.4, 24, 16), skin, 0.4, 5.7, -5.4);
    add(this.host, new CylinderGeometry(0.5, 0.6, 1.1, 12), skin, 0.4, 4.1, -5.4);
    const torso = add(this.host, new CylinderGeometry(2.7, 2.2, 8.4, 20), cloth, 0.4, -0.7, -5.5);
    torso.scale.z = 0.5;
    const shoulders = add(this.host, new SphereGeometry(2.75, 20, 10), cloth, 0.4, 3.3, -5.5);
    shoulders.scale.set(1, 0.34, 0.5);
    for (const sx of [-1, 1]) {
      const leg = add(this.host, new CylinderGeometry(1.0, 0.8, 12.6, 12), trousers, 0.4 + sx * 1.15, -11.4, -5.5);
      leg.scale.z = 0.8;
      // upper arms hang from the shoulders; the right forearm reaches the phone
      const upper = add(this.host, new CylinderGeometry(0.55, 0.5, 4.6, 10), cloth, 0.4 + sx * 2.85, 1.0, -5.4);
      upper.rotation.z = sx * 0.12;
    }
    const arm = add(this.host, new CylinderGeometry(0.42, 0.5, 5.6, 10), cloth, 2.0, -1.5, -2.9);
    arm.rotation.set(1.25, 0, -0.42);
    add(this.host, new SphereGeometry(0.62, 12, 10), skin, 0.58, -1.3, -0.42);

    // the room: floor of 30 cm tiles, back and side walls, skirting, a door and a picture for scale
    const floorTex = tiles("#c9b79c", "#bfad92", "#a8977e");
    floorTex.repeat.set(40, 40);
    this.texs.push(floorTex);
    const floor = add(this.world, new PlaneGeometry(60 * CM * 40, 60 * CM * 40), flat(0xffffff, floorTex), 0, FLOOR_Y, -40 * CM);
    floor.rotation.x = -Math.PI / 2;
    const wall = flat(0xe4e0d8), wallSide = flat(0xd9d5cc), skirt = flat(0xf4f2ee), wood = flat(0x8a6f52), dark = flat(0x5e4a36);
    const wallH = CEIL_Y - FLOOR_Y, midY = (CEIL_Y + FLOOR_Y) / 2;
    add(this.world, new PlaneGeometry(2 * SIDE_X, wallH), wall, 0, midY, BACK_Z);
    add(this.world, new PlaneGeometry(2 * SIDE_X, 9 * CM), skirt, 0, FLOOR_Y + 4.5 * CM, BACK_Z + 0.02);
    for (const sx of [-1, 1]) {
      const w = add(this.world, new PlaneGeometry(600 * CM, wallH), wallSide, sx * SIDE_X, midY, BACK_Z + 300 * CM);
      w.rotation.y = -sx * Math.PI / 2;
      const s = add(this.world, new PlaneGeometry(600 * CM, 9 * CM), skirt, sx * (SIDE_X - 0.02), FLOOR_Y + 4.5 * CM, BACK_Z + 300 * CM);
      s.rotation.y = -sx * Math.PI / 2;
    }
    const ceil = add(this.world, new PlaneGeometry(2 * SIDE_X, 600 * CM), flat(0xf2f0ec), 0, CEIL_Y, BACK_Z + 300 * CM);
    ceil.rotation.x = Math.PI / 2;
    // a door 90 x 203 cm and its frame
    add(this.world, new PlaneGeometry(102 * CM, 209 * CM), dark, 105 * CM, FLOOR_Y + 104.5 * CM, BACK_Z + 0.03);
    add(this.world, new PlaneGeometry(90 * CM, 203 * CM), wood, 105 * CM, FLOOR_Y + 101.5 * CM, BACK_Z + 0.05);
    add(this.world, new SphereGeometry(2.4 * CM, 10, 8), flat(0xd8c9a0), 70 * CM, FLOOR_Y + 100 * CM, BACK_Z + 0.4);
    // a picture 50 x 70 cm at eye height
    add(this.world, new PlaneGeometry(54 * CM, 74 * CM), flat(0x2b2f36), -95 * CM, FLOOR_Y + 150 * CM, BACK_Z + 0.03);
    add(this.world, new PlaneGeometry(46 * CM, 66 * CM), flat(0xf7f5f0), -95 * CM, FLOOR_Y + 150 * CM, BACK_Z + 0.05);
    add(this.world, new PlaneGeometry(30 * CM, 30 * CM), flat(0xd9534a), -95 * CM, FLOOR_Y + 158 * CM, BACK_Z + 0.07);
    // a sideboard 120 x 75 x 40 cm under the picture
    add(this.world, new BoxGeometry(120 * CM, 75 * CM, 40 * CM), flat(0xb59a78), -95 * CM, FLOOR_Y + 37.5 * CM, BACK_Z + 20 * CM);
    add(this.world, new BoxGeometry(122 * CM, 3 * CM, 42 * CM), flat(0x9c8362), -95 * CM, FLOOR_Y + 76.5 * CM, BACK_Z + 20 * CM);

    this.world.add(this.phone, this.host);
    this.world.matrixAutoUpdate = false;
    this.scene.add(this.world);
  }

  setProjection(fovY: number, aspect: number): void {
    this.camera.fov = fovY;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Pose of the card plane in camera space, or null to look at the empty room. */
  setPose(m: Float32Array | null): void {
    this.phone.visible = this.host.visible = !!m;
    this.world.matrix.copy(m ? this.m.fromArray(m) : this.emptyPose);
    this.world.matrixWorldNeedsUpdate = true;
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
    for (const g of this.geos) g.dispose();
    for (const m of this.mats) m.dispose();
    for (const t of this.texs) t.dispose();
    this.renderer.dispose();
  }
}
