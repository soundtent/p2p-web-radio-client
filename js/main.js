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
    frontend.updatePeerList();
}

function createFrontend() {
    let app = Vue.createApp({
        data() {
            return {
                peers: [],
                me: {},
                signallingStatus: "offline",
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
            disconnect(id) {
                removeConnection(id);
            }
        }
    })

    return app.mount("#app");
}

async function main() {
    frontend = createFrontend();
        
    sendingAudioElement = document.getElementById(`sendingAudioElement`);
    setupAudioElementCapture().then(() => {
        console.log("source stream ready");
        signalling.connect().then(() => {
            console.log("signalling connected")
        });
    });

}

const SIGNALLING_SERVER_URL = "https://soundcamp.radio";
const SIGNALLING_SERVER_PATH = "/p2p-web-radio/signalling-server/";

let frontend = undefined;

let sendingAudioElement = undefined;
let sendingAudioSource; // captures the output of sendingAudioElement as MediaStream oject

const connectionHandlers = []
const signalling = new Signaling();


window.addEventListener("load", (event) => {
    main();
});
