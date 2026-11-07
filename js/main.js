function getConnectionHandlerByPeerId(peerId) {
    return connectionHandlers.find(x => x.peerId === peerId);
}

function initiateNewConnection(peerId) {
    console.log(peerId);
    var newConnectionHandler = new WebRTCConnectionHandler(false, peerId);
    newConnectionHandler.start();
    connectionHandlers.push(newConnectionHandler);
}

function removeConnection(peerId) {
    var connectionHandler = getConnectionHandlerByPeerId(peerId);
    connectionHandler.close();

    const index = connectionHandlers.indexOf(connectionHandler);
    connectionHandlers.splice(index, 1);
    updateConnectionList
    frontend.updatePeerList();
}

function updateConnectionList() {
    connectionHandlers = connectionHandlers.filter(connectionHandler => {
        let peer = signalling.peers.find(x => x.id === connectionHandler.peerId)
        if (peer != undefined) {
            return true;
        } else {return false; }
    });
}

function createFrontend() {
    let app = Vue.createApp({
        data() {
            return {
                peers: [],
                me: {},
                signallingStatus: "offline",
                outputEnabled: false,
                outputType: "device",
            }
        },
        methods: {
            updatePeerList() {
                this.peers = signalling.peers;

                //get states from connectionHandlers
                for (var i=0;i<this.peers.length;i++) {
                    this.peers[i].connectionStatus = "disconnected";
                }
                for (var i=0;i<connectionHandlers.length;i++) {
                    var peer = this.peers.find(x => x.id === connectionHandlers[i].peerId);
                    peer.connectionStatus = connectionHandlers[i].connectionStatus;
                }
            },
            setMe(me) {
                this.me = me;
            },
            setSignallingStatus(signallingStatus) {
                this.signallingStatus = signallingStatus;
            },
            connect(id) {
                initiateNewConnection(id);
            },
            setOutput(_outputEnabled) {
                this.outputEnabled = _outputEnabled;

                if (this.outputEnabled) {
                    this.outputSettings = {
                        type: document.querySelector('input[name="output_type"]:checked').value
                    }
                    if (this.outputSettings.type == "local_file") {
                        this.outputSettings.src = document.getElementById('local_file_picker').value;
                    } else if (this.outputSettings.type == "remote_file") {
                        this.outputSettings.src = document.getElementById('remote_file_url').value;
                    } else if (this.outputSettings.type == "device") {
                        connectAudioDevice();
                    } else if (this.outputSettings.type == "relay") {
                        // connectAudioRelay();
                    }
                } else {
                    disconnectAudio()
                }
            },
            disconnect(id) {
                removeConnection(id);
            }
        }
    })

    return app.mount("#app");
}

async function main() {
    frontend = createFrontend();
    
    signalling.connect().then(() => {
        console.log("signalling connected")
    });

}

const SIGNALLING_SERVER_URL = "https://soundcamp.radio";
const SIGNALLING_SERVER_PATH = "/p2p-web-radio/signalling-server/";

let frontend = undefined;

//is an audio stream (e.g. audio element, audio device) connected to the output?
let outputConnected = false;

const webAudioAPICtx = new AudioContext();
const webAudioAPIDestination = webAudioAPICtx.createMediaStreamDestination();
const webAudioAPIMonitoringGain = webAudioAPICtx.createGain();
webAudioAPIMonitoringGain.gain.value = 0;
webAudioAPIMonitoringGain.connect(webAudioAPICtx.destination);
let webAudioAPIOutputNode = null;

let connectionHandlers = []
const signalling = new Signaling();


window.addEventListener("load", (event) => {
    main();
});
