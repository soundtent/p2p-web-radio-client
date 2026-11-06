// connect a new WebRTC MediaStream object with a local audio DOM element for playback
function addRemoteAudio(mediaStream, fromId) {
    var receivingAudioElement = document.getElementById("peerAudio_"+fromId);

    //event.streams[0] is a mediaStream object
    if (receivingAudioElement.srcObject !== mediaStream) {
        receivingAudioElement.srcObject = mediaStream;

        receivingAudioElement.play().then(() => {
            console.log(`Playback started successfully for peer ${fromId}`);
        }).catch((err) => {
            console.warn(`Autoplay blocked or failed for peer ${fromId}:`, err);
        });
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
    try {
        // Ensure context is running (browsers suspend audio contexts until user interaction)
        if (webAudioAPICtx.state === 'suspended') {
            webAudioAPICtx.resume();
        }

        const sourceNode = webAudioAPICtx.createMediaElementSource(sendingAudioElement);
        const destinationNode = webAudioAPICtx.createMediaStreamDestination();

        sourceNode.connect(destinationNode);

        //play audio locally through speakers
        sourceNode.connect(webAudioAPICtx.destination);

        sendingAudioSource = destinationNode.stream;
        console.log('Captured stream using Web Audio API MediaStreamDestination', sendingAudioSource);
        resolve();
    } catch (err) {
        reject(new Error('Web Audio API capture setup failed: ' + err.message));
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

