class Signaling {
    constructor() {
        this.connected = false;
        this.peers = [];
        this.me = null;
        this._socket = null;
    }

    connect() {
        return new Promise((resolve, reject) => {
            if (this._socket) {
                return new Error("already has socket");
            }

            // Connect to the signaling server
            console.log('creating socket...');
            this._socket = io(SIGNALLING_SERVER_URL, {path: SIGNALLING_SERVER_PATH});

            this._socket.on('whoami', (me) => {
                this.me = me;
                this.connected = true;
                frontend.setMe(this.me);
                frontend.setSignallingStatus("online");
                resolve();
            });

            this._socket.on('peers', async ({peers: peers}) => {
                this.peers = peers;
                updateConnectionList(); //maybe not necessary
                frontend.updateConnectionList();
                console.log("Peers: "+JSON.stringify(this.peers));
            });

            this._socket.on('offer', async ({fromId, sessionDesc}) => {
                console.log(`Received offer from ${fromId}`);
                var newConnectionHandler = new WebRTCConnectionHandler(true, fromId);
                newConnectionHandler.onSDPReceived(sessionDesc)
                connectionHandlers.push(newConnectionHandler);
            });

            this._socket.on('answer', async ({fromId, sessionDesc}) => {
                console.log(`Received answer from ${fromId}`);
                let connectionHandler = getConnectionHandlerByPeerId(fromId, false)
                if (connectionHandler) {
                    connectionHandler.onSDPReceived(sessionDesc)
                }
            });

            this._socket.on('ice-candidate', async ({fromId, fromIsSender, candidate}) => {
                console.log("Received ICE candidate")
                let connectionHandler = getConnectionHandlerByPeerId(fromId, !fromIsSender)
                if (connectionHandler) {
                    connectionHandler.onCandidateReceived(candidate)
                }
            });

            this._socket.emit('whoami');
        });
    }
    
    sendOffer(peerId, sessionDesc) {
        console.log('Sending offer...');
        this._socket.emit('offer', { peerId: peerId, sessionDesc: sessionDesc });
    }

    sendAnswer(peerId, sessionDesc) {
        console.log('Sending answer...');
        this._socket.emit('answer', { peerId: peerId, sessionDesc: sessionDesc });
    }

    sendIceCandidate(peerId, fromIsSender, candidate) {
        console.log('sending ICE candidate...');
        this._socket.emit('ice-candidate', { peerId: peerId, fromIsSender: fromIsSender, candidate: candidate});
    }

    disconnect() {
        console.log('closing socket...');
        this._socket.close();
        this.connected = false;
        frontend.setMe({});
        frontend.setSignallingStatus("offline");
    }

    send(eventId, ev) {
        this._socket.emit(eventId, ev);
    }
}
