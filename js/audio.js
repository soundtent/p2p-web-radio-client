// connect a new WebRTC MediaStream object with a local audio DOM element for playback
function addRemoteAudio(mediaStream, fromId) {
    var receivingAudioElement = document.getElementById("peerAudio_"+fromId);

    //event.streams[0] is a mediaStream object
    if (receivingAudioElement.srcObject !== mediaStream) {
        receivingAudioElement.srcObject = mediaStream;
    }
}

//set up sendingAudioElement, waiting for it to be buffered before capturing
function setupAudioElementCapture() {
    return new Promise((resolve, reject) => {
        // Audio tag capture must be set up after audio tracks are enumerated.
        sendingAudioElement.oncanplay = () => {
            _setupAudioElementCaptureToSend(resolve, reject);
        };
        if (sendingAudioElement.readyState >= 3) { //if audio has buffered
            _setupAudioElementCaptureToSend(resolve, reject);
        } else {
            resolve(); // wait oncanplay to be called
        }
    });
}

//start capturing audio from sendingAudioElement
function _setupAudioElementCaptureToSend(resolve, reject) {
    if (sendingAudioSource) {
        resolve();
        return;
    }

    if (sendingAudioElement.captureStream) {
        sendingAudioSource = sendingAudioElement.captureStream();
        console.log('Captured stream from sendingAudioElement with captureStream', sendingAudioSource);
        resolve();
        return;
    }
    if (sendingAudioElement.mozCaptureStream) {
        sendingAudioSource = sendingAudioElement.mozCaptureStream();
        console.log('Captured stream from sendingAudioElement with mozCaptureStream()', sendingAudioSource);
        resolve();
        return;
    }

    reject(new Error('captureStream() not supported'));
}

async function setupMicrophoneCapture() {
    // const devices = await navigator.mediaDevices.enumerateDevices();
    // devices.filter(device => device.kind === 'audioInput')
    // console.log("Microphones detected: "+devices);

    const constraints = {
    audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,

        channelCount: 2,
        sampleRate: 48000,
        sampleSize: 16,

        googHighpassFilter: false
    },
        video: false
    };

    sendingAudioSource = await navigator.mediaDevices.getUserMedia(constraints);
}

