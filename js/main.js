function getConnectionHandlerByPeerId(peerId, isSender) {
    return connectionHandlers.find(x => x.peerId == peerId && x.isSender == isSender);
}

function initiateNewConnection(peerId) {
    console.log(peerId);
    var newConnectionHandler = new WebRTCConnectionHandler(false, peerId);
    newConnectionHandler.start();
    connectionHandlers.push(newConnectionHandler);
}

function removeReceivingConnection(peerId) {
    var connectionHandler = getConnectionHandlerByPeerId(peerId, false);
    connectionHandler.close();

    const index = connectionHandlers.indexOf(connectionHandler);
    connectionHandlers.splice(index, 1);
    updateConnectionList();
    frontend.updateConnectionList();
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
                receivingConnections: [],
                sendingConnections: [],
                me: {},
                signallingStatus: "offline",
                outputEnabled: false,
                outputType: "device",
            }
        },
        methods: {
            updateConnectionList() {
                //copy without reference https://stackoverflow.com/questions/48219487/javascript-how-to-clone-array-without-reference
                this.receivingConnections = JSON.parse(JSON.stringify(signalling.peers));
                this.sendingConnections = JSON.parse(JSON.stringify(signalling.peers));

                //get states from connectionHandlers
                for (var i=0;i<signalling.peers.length;i++) {
                    this.receivingConnections[i].connectionStatus = "disconnected";
                    this.sendingConnections[i].connectionStatus = "disconnected";
                }
                for (var i=0;i<connectionHandlers.length;i++) {
                    if (connectionHandlers[i].isSender) {
                        var peer = this.sendingConnections.find(x => x.id === connectionHandlers[i].peerId);
                        peer.connectionStatus = connectionHandlers[i].connectionStatus;
                    } else {
                        var peer = this.receivingConnections.find(x => x.id === connectionHandlers[i].peerId);
                        peer.connectionStatus = connectionHandlers[i].connectionStatus;
                    }
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
                    if (this.outputSettings.type == "remote_file") {
                        this.outputSettings.src = document.getElementById('remote_file_url').value;
                    } else if (this.outputSettings.type == "device") {
                        connectAudioDevice();
                    } else if (this.outputSettings.type == "relay") {
                        let peerId = document.getElementById('relay_peerid').value;
                        connectAudioRelay(peerId);
                        
                        //wait for Dom element to exist before initialising audio meter
                        this.$nextTick(() => {
                            initialiseAudioMeter('peakMeter_output', webAudioAPIOutputNode)
                        });
                    }
                } else {
                    disconnectAudio()
                }
            },
            disconnect(id) {
                removeReceivingConnection(id);
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
webAudioAPIMonitoringGain.connect(webAudioAPICtx.destination);
let webAudioAPIOutputNode = null;

let peakMeters = {}; //uses socket id for keys

let connectionHandlers = []
const signalling = new Signaling();


window.addEventListener("load", (event) => {
    webAudioAPIMonitoringGain.gain.value = 0;
    main();
});
