class WebRTCConnectionHandler {
    constructor(isSender, peerId) {
        this.peerId = peerId;
        this.connectionStatus = "disconnected";
        this.isSender = isSender; // true=sender, false=receiver
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
        if (this.isSender) {
            // Sender won't initiate connection. Only the receiver does this
            return;
        }

        this._createNewConnection();
        this._pc.ontrack = this._onTrack;
        this._pc.onsignalingstatechange = () => {
            console.log('signaling state: %s', this._pc.signalingState);
        };


        // For Safari compatibility: Explicitly add an audio transceiver instead of using legacy offerToReceiveAudio
        this._pc.addTransceiver('audio', { direction: 'recvonly' });

        // Create an offer and send it to the peer
        console.log('createOffer start');
        this._pc.createOffer().then((offer) => {
            return this._onCreateOfferSuccess(offer);
        }).catch((err) => {
            console.log('createOffer failed:', err);
        });

    }

    // Close a connection
    close() {
        if (!this._pc) {
            return;
        }
        this._pc.close();
        removeRemoteAudio(this.peerId);
    }

    // Create and configure this._pc
    _createNewConnection() {
        console.log('Starting creating peer connection');
        this._pc = new RTCPeerConnection(this._iceServers);
        console.log('Created local peer connection object this._pc');
        this._pc.onicecandidate = (e) => this._onIceCandidate(e);
        this._pc.oniceconnectionstatechange = (e) => {
            this.connectionStatus = this._pc.iceConnectionState;
            frontend.updateConnectionList();
        };
    }

    // When an offer has been created (via start), send it to the peer
    _onCreateOfferSuccess(sessionDesc) {
        const sDesc = JSON.stringify(sessionDesc);
        console.log(`created offer: ${sDesc}`);
        console.log('offerer: setLocalDescription start');
        
        this._pc.setLocalDescription(sessionDesc).then(() => {
            console.log('offerer: setLocalDescription complete');
        }).catch((err) => {
            console.log('offerer: setLocalDescription failed:', err);
        });

        signalling.sendOffer(this.peerId, sessionDesc);
    }
    // When an answer has been created (via onSDPReceived), set it locally and send it to the peer
    _onCreateAnswerSuccess(sessionDesc) {
        const sDesc = JSON.stringify(sessionDesc);
        console.log(`created answer: ${sDesc}`);
        console.log('setLocalDescription start');
        
        this._pc.setLocalDescription(sessionDesc).then(() => {
            console.log('setLocalDescription complete');
        }).catch((err) => {
            console.log('setLocalDescription failed:', err);
        });

        signalling.sendAnswer(this.peerId, sessionDesc);
    }

    // When an incoming SDP arrives (e.g. an offer or an answer), respond if necessary with an answer
    onSDPReceived(sessionDesc) {
        if (sessionDesc.hasOwnProperty("type")) {
            if (sessionDesc.type === "offer" || sessionDesc.type === "answer" || sessionDesc.type === "pranswer") {
                console.log('received %s', sessionDesc.type);
                console.dir(sessionDesc);

                if (this.isSender) {
                    this._createNewConnection();
                    // ######################
                    let inputStream = webAudioAPIDestination.stream;
                    inputStream.getTracks().forEach((track) => this._pc.addTrack(track, inputStream));
                    console.log('added local stream to pc');

                    console.log("remote description:", sessionDesc);
                    this._pc.setRemoteDescription(new RTCSessionDescription(sessionDesc)).then(() => {
                        console.log(`setRemoteDescription complete`);
                        
                        // Create answer
                        console.log('createAnswer start');
                        return this._pc.createAnswer();
                    }).then((answer) => {
                        return this._onCreateAnswerSuccess(answer);
                    }).catch((err) => {
                        console.log(`SDP handling or setRemoteDescription/createAnswer failed:`, err);
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

    // When a remote peer has added a new media track, add it to the local audio element
    // This must be an arrow function because it is called from this.pc (otherwise the value of "this" changes)
    _onTrack = (event) => {
        console.log('offerer: received remote stream', event);
        addRemoteAudio(event.streams[0], this.peerId);
    }

    // When an ice candidate has been added(via onCandidateReceived) then send it to the peer
    _onIceCandidate(event) {
        if (event.candidate) {
            signalling.sendIceCandidate(this.peerId, this.isSender, event.candidate);
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
