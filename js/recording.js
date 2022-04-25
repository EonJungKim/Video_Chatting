/**
 * @파일제목   :
 * @프로젝트명 : Video Chatting
 * @소유      : 명지정보기술
 * @생성자    : 김언중
 * @생성날짜   : 2022-02-24
 *
 * == 수정사항 ==
 * ---------------------------
 * 2022-02-24  김언중 최초 생성
 */

var mediaSource = new MediaSource();
mediaSource.addEventListener('sourceopen', handleSourceOpen, false);

var mediaRecorder;
var recordedBlobs;
var sourceBuffer;

var gumVideo = document.querySelector('video#gum');
var recordedVideo = document.querySelector('video#recorded');

var recordButton = document.querySelector('button#record');
var playButton = document.querySelector('button#play');
var downloadButton = document.querySelector('button#download');

recordButton.onclick = toggleRecording;
playButton.onclick = play;
downloadButton.onclick = download;

var isSecureOrigin = location.protocol === 'https:' || locaion.hostname === 'localhost';
if (!isSecureOrigin) {
    alert('getUserMedia() must be run from a secure origin:HTTPS or localhost.' + '\n\nChanging protocol to HTTPS');
    locaion.protocol = 'HTTPS';
}

var constraints = {
    audio: true,
    video: true
};

function handleSuccess(stream) {
    recordButton.disabled = false;
    console.log('getUserMedia() got stream:', stream);
    window.stream = stream;

    if (window.URL) {
        gumVideo.src = window.URL.createObjectURL(stream);
    } else {
        gumVideo.src = stream;
    }
}

function handleError(error) {
    console.log('navigator.getUserMedia error:', error);
}

navigator.mediaDevices.getUserMedia(constraints).then(handleSuccess).catch(handleError);

function handleSourceOpen(event) {
    console.log('MediaSource opened');
    sourceBuffer = mediaSource.addSourceBuffer('video/webm;codecs="vp8"');
    console.log('Source  buffer:', sourceBuffer);
}

recordedVideo.addEventListener('error', function(ev) {
    console.error('MediaRecording.recordedMedia.error()');
    alert('Your browser can not play\n\n' + recordedVideo.src + '\n\n media clip.event:' + JSON.stringify(ev));
}, true);

function handleDataAvailable(event) {
    if (event.data && event.data.size > 0) {
        recordedBlobs.push(event.data);
    }
}

function handleStop(event) {
    console.log('Recorder stopped:', event);
}

function toggleRecording() {
    if (recordButton.textContent === 'Start Recording') {
        startRecording();
    } else {
        stopRecording();
        recordButton.textContent = 'Start Recording';
        playButton.disabled = false;
        downloadButton.disabled = false;
    }
}

function startRecording() {
    recordedBlobs = [];
    var options = {mimeType: 'video/mp4;codecs=vp9'};
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.log(options.mimeType + 'is not Supported');
        options = {mimeType: 'video/mp4;codecs=vp8'};
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            console.log(options.mimeType + 'is not Supported');
            options = {mimeType: 'video/mp4'};

            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                console.log(options.mimeType + 'is not Supported');
                options = {mimeType: ''};
            }
        }
    }

    try {
        mediaRecorder = new MediaRecorder(window.stream, options);
    } catch (e) {
        console.error('Exception while creating MediaRecorder:' + e);
        alert('Exception while creating MediaRecorder:' + e +'.mineType:' + options.mimeType);
        return;
    }

    console.log('Created MediaRecorder', mediaRecorder, 'with options', options);
    recordButton.textContent = 'Stop Recording';
    playButton.disabled = true;
    downloadButton.disabled = true;
    mediaRecorder.onstop = handleStop;
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start(10);
    console.log('MediaRecorder Started', mediaRecorder);
}

function stopRecording() {
    mediaRecorder.stop();
    console.log('Recorded Blobs:', recordedBlobs);
    recordedVideo.controls = true;
}

function play() {
    var superBuffer = new Blob(recordedBlobs, {type:'video/mp4'});
    recordedVideo.src = window.URL.createObjectURL(superBuffer);
}

function download() {
    var blob = new Blob(recordedBlobs, {type: 'video/mp4'});
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'test.mp4';
    document.body.appendChild(a);
    a.click();

    setTimeout(function(){
       document.body.removeChild(a);
       window.URL.revokeObjectURL(url);
    }, 100);
}