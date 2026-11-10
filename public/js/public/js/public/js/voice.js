let localStream = null;
let peerConnections = {};
let isMuted = false;

async function initVoice() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    console.error('Microphone access denied:', err);
    alert('Microphone access is required for voice chat.');
  }
}

function createPeerConnection(targetId) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });
  
  if (localStream) {
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  }
  
  pc.onicecandidate = (event) => {
    if (event.candidate) socket.emit('voiceSignal', { targetId, candidate: event.candidate });
  };
  
  pc.ontrack = (event) => {
    const audio = new Audio();
    audio.srcObject = event.streams[0];
    audio.play().catch(e => console.log('Audio play blocked by browser', e));
  };
  
  peerConnections[targetId] = pc;
  return pc;
}

socket.on('voiceSignal', async ({ fromId, offer, answer, candidate }) => {
  let pc = peerConnections[fromId];
  if (offer) {
    if (!pc) pc = createPeerConnection(fromId);
    await pc.setRemoteDescription(offer);
    const ans = await pc.createAnswer();
    await pc.setLocalDescription(ans);
    socket.emit('voiceSignal', { targetId: fromId, answer: ans });
  } else if (answer && pc) {
    await pc.setRemoteDescription(answer);
  } else if (candidate && pc) {
    await pc.addIceCandidate(candidate);
  }
});

function connectToAllPeers() {
  for (const id in players) {
    if (id !== myId && players[id].alive && !peerConnections[id]) {
      const pc = createPeerConnection(id);
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        socket.emit('voiceSignal', { targetId: id, offer });
      });
    }
  }
}

function toggleMute() {
  if (!localStream) return;
  isMuted = !isMuted;
  localStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
  document.getElementById('muteBtn').style.display = isMuted ? 'none' : 'block';
  document.getElementById('unmuteBtn').style.display = isMuted ? 'block' : 'none';
}

function closeAllPeers() {
  for (const id in peerConnections) {
    peerConnections[id].close();
  }
  peerConnections = {};
}
