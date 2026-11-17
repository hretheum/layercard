// Classic worker: ArUco 4x4 detection off the main thread. Receives an RGBA region of the camera frame
// and returns marker corners in full-frame camera pixels.
importScripts("vendor/js-aruco2/cv.js", "vendor/js-aruco2/aruco.js", "vendor/js-aruco2/aruco_4x4_1000.js");
const detector = new AR.Detector({ dictionaryName: "ARUCO_4X4_1000" });

onmessage = (e) => {
  const { seq, width, height, buffer, ox, oy, scale } = e.data;
  const t0 = performance.now();
  let markers = [];
  try {
    markers = detector.detect({ width, height, data: new Uint8ClampedArray(buffer) });
  } catch (err) {
    postMessage({ seq, ms: performance.now() - t0, markers: [], error: String(err) });
    return;
  }
  postMessage({
    seq,
    ms: performance.now() - t0,
    markers: markers.map((m) => ({ id: m.id, corners: m.corners.map((c) => [c.x * scale + ox, c.y * scale + oy]) })),
  });
};
