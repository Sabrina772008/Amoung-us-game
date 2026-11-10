let localStream = null;
let peerConnections = {};
let isMuted = false;

async function initVoice() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    console.error('Microphone access denied:', err);
  }
}

function createPeerConnection(targetId) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });
  
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  
  pc.onicecandidate = (event) => {
    if (event.candidate) socket.emit('iceCandidate', { targetId, candidate: event.candidate });
  };
  
  pc.ontrack = (event) => {
    const audio = new Audio();
    audio.srcObject = event.streams[0];
    audio.play();
  };
  
  peerConnections[targetId] = pc;
  return pc;
}

socket.on('voiceOffer', async ({ fromId, offer }) => {
  const pc = createPeerConnection(fromId);
  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit('voiceAnswer', { targetId: fromId, answer });
});

socket.on('voiceAnswer', async ({ fromId, answer }) => {
  const pc = peerConnections[fromId];
  if (
