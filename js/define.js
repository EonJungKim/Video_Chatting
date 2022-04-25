/**
 * @파일제목   : define.js
 * @프로젝트명 : Video Chatting
 * @소유      : 명지정보기술
 * @생성자    : 김언중
 * @생성날짜   : 2022-02-24
 *
 * == 수정사항 ==
 * ---------------------------
 * 2022-02-24  김언중 최초 생성
 */

const URL_BASE = 'http://220.124.4.195:33000';

// STUN Server 설정
const pcConfig = {
    'iceServers': 	[
        {urls:'stun:stun.l.google.com:19302'},
        {urls:'stun:stun1.l.google.com:19302'},
        {urls:'stun:stun2.l.google.com:19302'},
        {urls:'stun:stun3.l.google.com:19302'},
        {urls:'stun:stun4.l.google.com:19302'},
        {
            urls: 'turn:220.124.4.195:3478?transport=tcp',
            credential: 'mjinfo2020',
            username: 'jek888'
        },
        {
            urls: 'turn:220.124.4.195:3478?transport=udp',
            credential: 'mjinfo2020',
            username: 'jek888'
        }
    ],
};