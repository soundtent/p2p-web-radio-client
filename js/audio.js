// connect a new WebRTC MediaStream object with a local audio DOM element for playback
function addRemoteAudio(mediaStream, fromId) {
    var receivingAudioElement = document.getElementById("peerAudio_"+fromId);

    if (receivingAudioElement.srcObject !== mediaStream) {
        receivingAudioElement.srcObject = mediaStream;

        receivingAudioElement.play().then(() => {
            console.log(`Playback started successfully for peer ${fromId}`);
        }).catch((err) => {
            console.warn(`Autoplay blocked or failed for peer ${fromId}:`, err);
        });
    }
}

// remove a new WebRTC MediaStream object from a local audio DOM element for playback
function removeRemoteAudio(fromId) {
    var receivingAudioElement = document.getElementById("peerAudio_"+fromId);
    if (receivingAudioElement) {
        receivingAudioElement.srcObject = null;
    }
}

//set up audioElement, waiting for it to be buffered before capturing
function connectAudioElement(audioElement) {
    return new Promise((resolve, reject) => {
        // Audio tag capture must be set up after audio tracks are enumerated.
        audioElement.oncanplay = () => {
            _connectAudioElement2(resolve, reject, audioElement);
        };
        if (audioElement.readyState >= 3) { //if audio has buffered
            _connectAudioElement2(resolve, reject, audioElement);
        } else {
            resolve(); // wait oncanplay to be called
        }
    });
}

//start capturing audio from audioElement
function _connectAudioElement2(resolve, reject, audioElement) {
    if (outputConnected) {
        resolve();
        return;
    }
    try {
        if (webAudioAPICtx.state === 'suspended') {
            webAudioAPICtx.resume();
        }
        webAudioAPIOutputNode = webAudioAPICtx.createMediaElementSource(audioElement);
        webAudioAPIOutputNode.connect(webAudioAPIDestination);
        //play audio locally through speakers
        webAudioAPIOutputNode.connect(webAudioAPIMonitoringGain);

        outputConnected = true;
        console.log('Connected audio element to Web Audio API destination');
        resolve();
    } catch (err) {
        reject(new Error('Connected audio element to Web Audio API destination: ' + err.message));
    }
}

//remove any connections from the WebAudioAPI destinations
function disconnectAudio() {
    webAudioAPIOutputNode.disconnect()
    outputConnected = false;
    console.log('Disconnected audio element to Web Audio API destination');
}

function setMonitoringVolume(inputElement) {    
    var fraction = parseInt(inputElement.value) / parseInt(inputElement.max);
    // Let's use an x*x curve (x-squared) since simple linear (x) does not sound as good.
    webAudioAPIMonitoringGain.gain.value = fraction * fraction;
    console.log("Set monitoring volume to: "+webAudioAPIMonitoringGain.gain.value)
}

function connectAudioDevice() {
    return new Promise((resolve, reject) => {
        // const devices = await navigator.mediaDevices.enumerateDevices();
        // devices.filter(device => device.kind === 'audioInput')
        // console.log("Microphones detected: "+devices);

        let audioConstraints = true;

        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

        if (!isSafari) {
            audioConstraints = {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                channelCount: { ideal: 2 },
                sampleRate: { ideal: 48000 }
            };

            // Add non-standard properties
            const supported = navigator.mediaDevices.getSupportedConstraints();
            if (supported.sampleSize) {
                audioConstraints.sampleSize = { ideal: 16 };
            }
            if (supported.googHighpassFilter) {
                audioConstraints.googHighpassFilter = false;
            }
        }

        const constraints = {
            audio: audioConstraints,
            video: false
        };

        if (!outputConnected) {
            try {
                if (webAudioAPICtx.state === 'suspended') {
                    webAudioAPICtx.resume();
                }

                navigator.mediaDevices.getUserMedia(constraints).then((mediaStream) => {
                    _connectAudioDevice2(resolve, reject, mediaStream); 
                });
            } catch (err) {
                reject(new Error('Connected audio device to Web Audio API destination: ' + err.message));
            }
        }
    });
}

function _connectAudioDevice2(resolve, reject, mediaStream) {
    try {
        webAudioAPIOutputNode = webAudioAPICtx.createMediaStreamSource(mediaStream);
        webAudioAPIOutputNode.connect(webAudioAPIDestination);
        //play audio locally through speakers
        webAudioAPIOutputNode.connect(webAudioAPIMonitoringGain);

        outputConnected = true;
        console.log('Connected audio device to Web Audio API destination');
        resolve();
    } catch (err) {
        reject(new Error(err.message));
    }
}