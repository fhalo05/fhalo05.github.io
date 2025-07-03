const socket = io('https://fhalo05-github-io.onrender.com'); // Replace with your backend URL

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
let localStream;
let peerConnection;
let partnerId = null;

const iceServers = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

async function startLocalStream() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
    document.querySelector('button').style.display = 'none';
    socket.emit('ready');
  } catch (error) {
    alert('Error accessing camera: ' + error.message);
  }
}

socket.on('partner-found', async (id) => {
  partnerId = id;
  peerConnection = new RTCPeerConnection(iceServers);

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('signal', { to: partnerId, data: { candidate: event.candidate } });
    }
  };

  if (socket.id < id) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('signal', { to: partnerId, data: { offer } });
  }
});

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
    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
  }
});

socket.on('partner-disconnected', () => {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  remoteVideo.srcObject = null;
});

// Chat
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const messages = document.getElementById('messages');

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (message && partnerId) {
    socket.emit('chat-message', { to: partnerId, message });
    appendMessage(`You: ${message}`);
    chatInput.value = '';
  }
});

socket.on('chat-message', ({ from, message }) => {
  appendMessage(`Stranger: ${message}`);
});

function appendMessage(msg) {
  const div = document.createElement('div');
  div.textContent = msg;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

