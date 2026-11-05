class WebRTCConnectionHandler {
    constructor(isSender, peerId) {
        this.peerId = peerId;
        this.connectionStatus = "disconnected";
        this._isSender = isSender; // true=sender, false=receiver
        this._iceServers = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ]
        }
        this._pc = undefined; //WebRTC Peer Connection object
    }

    // Create and configure a new connection
    start() {
        if (this._isSender) {
            // Sender won't initiate connection. Only the receiver does this
            return;
        }

        this._createNewConnection();
        this._pc.ontrack = this._onTrack;
        this._pc.onsignalingstatechange = (event) => {
            console.log('signaling state: %s', this._pc.signalingState);
        };

        console.log('createOffer start');
        this._pc.createOffer(this._onCreateOfferSuccess.bind(this), (err) => {
            console.log('createOffer failed:', err);
        }, {
            offerToReceiveAudio: true,
            offerToReceiveVideo: false
        });

    }

    // Close a connection
    close() {
        if (!this._pc) {
            return;
        }
        this._pc.close();
    }

    // Create and configure this._pc
    _createNewConnection() {
        console.log('Starting creating peer connection');
        this._pc = new RTCPeerConnection(this._iceServers);
        console.log('Created local peer connection object this._pc');
        this._pc.onicecandidate = (e) => this._onIceCandidate(e);
        this._pc.oniceconnectionstatechange = (e) => {
            this.connectionStatus = this._pc.iceConnectionState;
            frontend.updatePeerList();
        };
    }

    // When an offer has been created (via start), send it to the peer
    _onCreateOfferSuccess(sessionDesc) {
        const sDesc = JSON.stringify(sessionDesc);
        console.log(`created offer: ${sDesc}`);
        console.log('offerer: setLocalDescription start');
        this._pc.setLocalDescription(sessionDesc, () => {
            console.log('offerer: setLocalDescription complete');
        }, (err) => {
            console.log('offerer: setLocalDescription failed:', err);
        });

        signalling.sendOffer(this.peerId, sessionDesc)
    }

    // When an incoming SDP arrives (e.g. an offer or an answer), respond if necessary with an answer
    onSDPReceived(sessionDesc) {
        if (sessionDesc.hasOwnProperty("type")) {
            if (sessionDesc.type === "offer" || sessionDesc.type === "answer" || sessionDesc.type === "pranswer") {
                console.log('received %s', sessionDesc.type);
                console.dir(sessionDesc);

                if (this._isSender) {
                    this._createNewConnection();
                    sendingAudioSource.getTracks().forEach((track) => this._pc.addTrack(track, sendingAudioSource));
                    console.log('added local stream to pc');

                    console.log("remote description:", sessionDesc);
                    this._pc.setRemoteDescription(sessionDesc, () => {
                        console.log(`setRemoteDescription complete`);
                    }, (err) => {
                        console.log(`setRemoteDescription failed:`, err);
                    });

                    // Create answer
                    console.log('createAnswer start');
                    this._pc.createAnswer(this._onCreateAnswerSuccess.bind(this), (err) => {
                        console.log('createAnswer failed:', err);
                    });
                } else {
                    this._pc.setRemoteDescription(sessionDesc, () => {
                        console.log(`setRemoteDescription complete`);
                    }, (err) => {
                        console.log(`setRemoteDescription failed:`, err);
                    });
                }
            } else {
                console.log("Unsupported SDP type: %s", sessionDesc.type);
            }
        } else {
            console.dir(sessionDesc);
        }
    }
    
    // When an answer has been created (via onSDPReceived), set it locally and send it to the peer
    _onCreateAnswerSuccess(sessionDesc) {
        const sDesc = JSON.stringify(sessionDesc);
        console.log(`created answer: ${sDesc}`);
        console.log('setLocalDescription start');
        this._pc.setLocalDescription(sessionDesc, () => {
            console.log('setLocalDescription complete');
        }, (err) => {
            console.log('setLocalDescription failed:', err);
        });

        signalling.sendAnswer(this.peerId, sessionDesc)
    }

    // When a remote peer has added a new media track, add it to the local audio element
    // This must be an arrow function because it is called from this.pc (otherwise the value of "this" changes)
    _onTrack = (event) => {
        console.log('offerer: received remote stream', event);
        addRemoteAudio(event.streams[0], this.peerId);
    }

    // When an ice candidate has been added(via onCandidateReceived) then send it to the peer
    _onIceCandidate(event) {
        if (event.candidate) {
            signalling.sendIceCandidate(this.peerId, event.candidate);
        } else {
            console.log('end of ICE candidate');
        }
    }

    // When signalling receives an ICE candidate, add it
    onCandidateReceived(candidate) {
        console.log('addIceCandidate:');
        console.dir(candidate);
        this._pc.addIceCandidate(candidate).then(() => {
            console.log('addIceCandidate success');
        }, (err) => {
            console.log('addIceCandidate failed:', err);
        });
    }
}
