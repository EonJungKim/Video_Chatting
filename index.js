 'use strict';

const os = require('os');
const nodeStatic = require('node-static');
const socketIO = require('socket.io');

const https = require('https');		// WebRTC를 사용하기 위해서는 SSL을 적용해야 함.
const fs = require('fs');			// SSL 적용을 위하여 File 접근을 위하여 사용

// SSL 적용 파일(OpenSSL로 생성함)`
const options = {
    key: fs.readFileSync('./ssl.mjinfo.co.kr.key'),		// 개인키
    cert: fs.readFileSync('./ssl.mjinfo.co.kr.crt')			// 공개키
};

const fileServer = new(nodeStatic.Server)();
let app = https.createServer(options, function(req, res) {
    fileServer.serve(req, res); 
}).listen(3000);

// Socket 설정
const io = socketIO.listen(app);
io.sockets.on('connection', function(socket) {	
	socket.on('message', function(message) {
		console.log('Client said: ', message);
		
        var sender = message.sender;
        var room = message.room;
        var command = message.command;
        
		switch (command) {
			case "join":
				console.log(sender + '사용자가 채팅방 ' + room + '에 입장을 요청함.');
			
				var clientsInRoom = io.sockets.adapter.rooms[room];	// Room에 연결된 Client 목록
				var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;

				if (numClients === 0) {				// Room에 연결된 Client가 없을 경우 Create
					console.log('사용자 ' + socket.id + '가 채팅방 ' + room + '을 생성함.');

					socket.join(room);				// Room 생성

					io.sockets.in(room).emit ('created', message);
				} else if (numClients === 1) {		// Room에 연결된 Client가 1명일 경우
					console.log('사용자 ' + socket.id + '가 채팅방 ' + room + '에 참여함.');

					socket.join(room);

					io.sockets.in(room).emit ('joined', message);
				} else { 							// Room에 연결된 Client가 2명일 경우
					socket.emit('full', room);
				}

				io.sockets.in(room).emit ('message', message);
				break;
				
			case "leave":
				socket.leave(room);
				io.sockets.in(room).emit ('message', message);
				break;

			default:
				io.sockets.in(room).emit ('message', message);
		}
	});
	
	// Socket에 연결된 Peer가 Server의 IP Address를 요청할 경우 동작
	// Server의 Network 환경정보들을 가져와서 IPv4 주소를 응답.
  	socket.on('ipaddr', function() {
    	var ifaces = os.networkInterfaces();
		
    	for (var dev in ifaces) {
      		ifaces[dev].forEach(function(details) {
				if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          			socket.emit('ipaddr', details.address);
        		}
      		});
    	}
  	});
});