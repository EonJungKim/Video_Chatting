'use strict';

let isInitiator = false;        // 채팅방 개설자 구분 Flag

// 화상채팅 시작을 위한 Flag
let isChannelReady = false;
let isStarted = false;

let localStream;                // Local Media의 Stream
let localStreamBak;
let remoteStream;               // Remote Media의 Stream
let pc;                         // RTCPeerConnection 변수
let turnReady;

let localVideo;
let remoteVideo;

let constraints = { audio: false };

let userId;
let roomId;
let userType;

let videoSource;
let camFront;
let camBack;

function parseParams() {
	const strParam = location.search.replace("?", "");
	const params = strParam.split("&");

	for (let index in params) {
		const keyVal = params[index].split("=");

		switch (keyVal[0]) {
			case "userId":
				userId = keyVal[1];
				break;

			case "roomId":
				roomId = keyVal[1];
				break;

			case "userType":
				userType = keyVal[1];
				break;
		}
	}
}

async function init() {
	parseParams();

	socketModule.init();

	localVideo = document.querySelector('#localVideo');
	remoteVideo = document.querySelector('#remoteVideo');

	if (roomId !== '') {
		console.log('채팅방 ' + roomId + '에 대한 입장을 요청함.');

		const output = {sender: userId, room: roomId, command: 'join'};
		socketModule.sendMessage(output);
	}

	await maybeStart();

	await navigator.mediaDevices.enumerateDevices().then(gotDevices);

	// Local에서 테스팅하는 경우가 아니면 Turn Server 조회
	if (location.hostname !== 'localhost') {
		requestTurn('stun:stun.l.google.com:19302');
	}
}

function changeStream(stream) {
	localStreamBak = localStream;
	localStream = stream;
	localVideo.srcObject = stream;

	const output = { sender:userId, room:roomId, command:'changeStream' };
	socketModule.sendMessage(output);
}

// getUserMedia()에서 요청한 Audio, Video 장치 사용 권한을 사용자가 승인했을 경우 동작
// Local Device MediaStream
function gotStream(stream) {
  	console.log('Local Device의 Media Stream을 획득함.');
	console.log(stream);

  	localStream = stream;
  	localVideo.srcObject = stream;

    const output = { sender:userId, room:roomId, command:'gotStream' };
  	socketModule.sendMessage(output);
}

// MediaStreaming 시작
function maybeStart(type) {
	console.log('maybeStart is called.');

	if (videoSource === undefined || videoSource === 'front') {
		constraints.video = true;
	} else if (videoSource === "back") {
		constraints.video = { deviceId: camBack };
	}

	console.log(constraints);

	if (type === 'change') {
		navigator.mediaDevices.getUserMedia(constraints).then(changeStream).catch(function(e) {
			console.log('getUserMedia() error: ' + e.name);
		});
	} else {
		navigator.mediaDevices.getUserMedia(constraints).then(gotStream).catch(function(e) {
			console.log('getUserMedia() error: ' + e.name);
		});
	}
}

window.onbeforeunload = function() {
	hangup();
};

function createPeerConnection() {
    console.log('Remote와 RTCPeerConnection을 생성함.');

  	try {
    	pc = new RTCPeerConnection(pcConfig);

	 	// RTCPeerConnection 인스턴스에서 icecandidate 이벤트 발생시에 호출
		// Local Ice Agent가 Signaling Server를 통해 Remote Peer에게 Message를 전달 할 필요가 있을 때마다 발생
    	pc.onicecandidate = handleIceCandidate;
    	pc.onaddstream = handleRemoteStreamAdded;
    	pc.onremovestream = handleRemoteStreamRemoved;

    	console.log('RTCPeerConnection 생성 완료');
  	} catch (e) {
    	console.log('Failed to create PeerConnection, exception: ' + e.message);
    	alert('Cannot create RTCPeerConnection object.');
  	}
}

function handleIceCandidate(event) {
  	console.log('IceCandidate Event 수신 : ', event);

  	if (event.candidate) {
    	const output = {
            sender: userId,
            room: roomId,
            command: 'candidate',
			type: 'candidate',
      		label: event.candidate.sdpMLineIndex,
      		id: event.candidate.sdpMid,
      		candidate: event.candidate.candidate
    	};

        socketModule.sendMessage(output);
  	} else {
    	console.log('End of candidates.');
  	}
}

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

// 상대 Peer에게 연결 요청
function doCall() {
  	console.log('Remote Peer로 전송할 Offer 객체 생성');
  	pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
	console.log('Offer를 전송한 Peer로 응답할 Answer 객체 생성');
	console.log(pc);
	pc.createAnswer().then(setLocalAndSendMessage, onCreateSessionDescriptionError);
}

function setLocalAndSendMessage(sessionDescription) {
  	pc.setLocalDescription(sessionDescription);

    const output = { sender:userId, room:roomId, content:sessionDescription };

    if (sessionDescription.type === "offer") {
        output.command = "offer";
    } else if (sessionDescription.type === "answer") {
        output.command = "answer";
    }

	socketModule.sendMessage(output);
}

function onCreateSessionDescriptionError(error) {
	console.log('Failed to create session description: ' + error.toString());
}

// TURN Server에 요청
// @Param	turnURL	TURN Server URL
function requestTurn(turnURL) {
  	let turnExists = false;

  	for (const i in pcConfig.iceServers) {

    	if (pcConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
			turnExists = true;
			turnReady = true;
			break;
    	}
  	}

	if (!turnExists) {
    	console.log('Getting TURN server from ', turnURL);
    	// No TURN server. Get one from computeengineondemand.appspot.com:
    	const xhr = new XMLHttpRequest();
    	xhr.onreadystatechange = function() {
      		if (xhr.readyState === 4 && xhr.status === 200) {
        		const turnServer = JSON.parse(xhr.responseText);
        		console.log('Got TURN server: ', turnServer);
        		pcConfig.iceServers.push({
          			'urls': 'turn:' + turnServer.username + '@' + turnServer.turn,
          			'credential': turnServer.password
        		});
        		turnReady = true;
      		}
    	};

		xhr.open('GET', turnURL, true);
    	xhr.send();
  	}
}

function handleRemoteStreamAdded(event) {
	console.log('handleRemoteStreamAdded 호출됨.');

  	remoteStream = event.stream;
  	remoteVideo.srcObject = remoteStream;

  	remoteVideo.classList.add("remoteVideoInChatting");
  	localVideo.classList.add("localVideoInChatting");
}

function handleRemoteStreamRemoved(event) {
	console.log('handleRemoteStreamRemoved 호출됨. ');
	console.log(event);
	// pc.remote
}

function hangup() {
	console.log('hangup 호출됨.');
	stop();

    const output = { sender:userId, room:roomId, command:'leave' };
    socketModule.sendMessage(output);
}

function handleRemoteHangup() {
	remoteVideo.classList.remove("remoteVideoInChatting");
  	localVideo.classList.remove("localVideoInChatting");

  	console.log('화상채팅 Session이 종료됨.');

  	stop();
  	isInitiator = true;
  	maybeStart();
}

function stop() {
	localStream = undefined;
	remoteStream = undefined;
	isStarted = false;
	isChannelReady = false

	if (pc !== null && pc !== undefined) {
		pc.close();
		pc = null;
	}
}

function gotDevices(deviceInfos) {
	console.log(deviceInfos);

	for (let i=0; i<deviceInfos.length; ++i) {
		const deviceInfo = deviceInfos[i];
		if (deviceInfo.kind === 'videoinput') {
			const label = deviceInfo.label;

			if (label.includes("back") || label.includes("후면")) {
				camBack = deviceInfo.deviceId;
			}
		}
	}
}

async function changeCam() {
	if (camBack === undefined) {
		await navigator.mediaDevices.enumerateDevices().then(gotDevices);
	}

	if (videoSource === undefined || videoSource === "front") {
		videoSource = "back";
	} else {
		videoSource = "front";
	}

	maybeStart('change');
}