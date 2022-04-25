/**
 * @파일제목   : socket.js
 * @프로젝트명 : Video Chatting
 * @소유      : 명지정보기술
 * @생성자    : 김언중
 * @생성날짜   : 2022-02-22
 *
 * == 수정사항 ==
 * ---------------------------
 * 2022-02-22  김언중 최초 생성
 */

const socketModule = {
    socket : null,
    init : function() {
        this.socket = io.connect();
        this.socketBinding();
    },
    socketBinding : function () {
        // 채팅방 생성 완료 Event Handler
        this.socket.on('created', function(message) {
            console.log('채팅방 ' + roomId + '을 생성함.');
            isInitiator = true;
        });

        // 인원 초과로 인한 채팅방 입장 실패 Event Handler
        this.socket.on('full', function(message) {
            console.log('채팅방 ' + roomId + '은 이미 정원을 초과함.');
        });

        // 새로운 사용자 입장 Event Handler
        this.socket.on('joined', function(message) {
            console.log('채팅방 ' + roomId + '에 입장함.');
            isChannelReady = true;
        });

        // Message를 받았을 경우 동작
        this.socket.on('message', function(message) {
            console.log('Client received message:', message);

            const sender = message.sender;
            const command = message.command;

            switch (command) {
                case 'gotStream':
                    // 아직 P2P 통신을 시작하지 않은 경우
                    if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
                        createPeerConnection();			// Peer Connection 생성
                        pc.addStream(localStream);
                        isStarted = true;				// 통신 시작 Flag를 true 로 변경

                        // Room을 만든 Peer인 경우
                        if (isInitiator) {
                            doCall();
                        }
                    }
                    break;

                case 'changeStream':
                    if (typeof localStream !== 'undefined' && isChannelReady && sender === userId) {
                        pc.removeStream(localStreamBak);
                        pc.addStream(localStream);
                        doCall();
                    }
                    break;

                case 'offer':
                    if (sender !== userId) {
                        if (!isStarted) {
                            maybeStart();
                        }

                        pc.setRemoteDescription(new RTCSessionDescription(message.content));
                        doAnswer();
                    }
                    break;

                case 'answer':
                    if (isStarted && sender !== userId) {
                        pc.setRemoteDescription(new RTCSessionDescription(message.content));
                    }
                    break;

                case 'candidate':
                    if (isStarted && sender !== userId) {
                        const candidate = new RTCIceCandidate({ sdpMLineIndex: message.label, candidate: message.candidate});
                        pc.addIceCandidate(candidate);
                    }
                    break;

                case 'leave':
                    if (isStarted) {
                        handleRemoteHangup();
                    }
                    break;
            }
        });
    },
    sendMessage : function (message) {
        console.log('Client sending message: ', message);
        this.socket.emit('message', message);
    }
}