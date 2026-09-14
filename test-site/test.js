const output = document.getElementById("output");
const status = document.getElementById("monitor-status");
const log = text => output.textContent += `${text}\n`;

function updateMonitorStatus() {
  const bridge = window.__privacyMonitorBridge;
  if (!bridge) {
    status.textContent = "Privacy Monitor bridge: NOT DETECTED";
    status.className = "status bad";
    return;
  }
  status.textContent = `Privacy Monitor bridge: ACTIVE (media=${bridge.mediaPatched ? "yes" : "no"}, location=${bridge.geoCurrentPatched ? "yes" : "no"})`;
  status.className = bridge.active ? "status good" : "status bad";
}

updateMonitorStatus();
setTimeout(updateMonitorStatus, 500);

document.getElementById("camera").onclick = async () => {
  log("Camera: request started.");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    log("Camera: SUCCESS — the browser actually returned a MediaStream.");
    stream.getTracks().forEach(track => track.stop());
  } catch (e) {
    log(`Camera: BLOCKED/FAILED — ${e.name}: ${e.message}`);
  }
};

document.getElementById("microphone").onclick = async () => {
  log("Microphone: request started.");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    log("Microphone: SUCCESS — the browser actually returned a MediaStream.");
    stream.getTracks().forEach(track => track.stop());
  } catch (e) {
    log(`Microphone: BLOCKED/FAILED — ${e.name}: ${e.message}`);
  }
};

document.getElementById("location").onclick = () => {
  log("Location: request started.");
  navigator.geolocation.getCurrentPosition(
    pos => log(`Location: SUCCESS — browser returned coordinates ${pos.coords.latitude.toFixed(2)},${pos.coords.longitude.toFixed(2)}.`),
    e => log(`Location: BLOCKED/FAILED — ${e.message}`)
  );
};

document.getElementById("transmission")?.addEventListener("click", async () => {
  log("Transmission: request started. This is a normal fetch test, not camera/mic/location.");
  try {
    const dummy = {
      test: true,
      message: "dummy local test data",
      timestamp: new Date().toISOString()
    };
    const response = await fetch("/dummy-upload", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(dummy)
    });
    log(response.ok
      ? "Transmission: SUCCESS — Privacy Monitor does not currently block arbitrary fetch/HTTPS payloads."
      : `Transmission: FAILED — HTTP ${response.status}`);
  } catch (e) {
    log(`Transmission: BLOCKED/FAILED — ${e.name}: ${e.message}`);
  }
});
