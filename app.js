const socket = io('https://fhalo05-github-io.onrender.com'); // Replace with your backend URL

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream;
let peerConnection;

const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

// Start local camera and mic
async function startLocalStream() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
  } catch (error) {
    alert('Could not access camera/microphone: ' + error.message);
  }
}

startLocalStream();

// When matched with a partner
socket.on('partner-found', async (partnerId) => {
  peerConnection = new RTCPeerConnection(iceServers);

  // Add local tracks to peer connection
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  // Set remote video stream when received
  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  // Send ICE candidates to partner
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('signal', { to: partnerId, data: { candidate: event.candidate } });
    }
  };

  // To avoid both peers creating offer simultaneously, use socket IDs to decide who creates offer
  if (socket.id < partnerId) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('signal', { to: partnerId, data: { offer } });
  }
});

// Receive signaling data
socket.on('signal', async ({ from, data }) => {
  if (!peerConnection) return;

  if (data.offer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('signal', { to: from, data: { answer } });
  } else if (data.answer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
  } else if (data.candidate) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (e) {
      console.error('Error adding ICE candidate:', e);
    }
  }
});

// Clean up when partner disconnects
socket.on('partner-disconnected', () => {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  remoteVideo.srcObject = null;
});
