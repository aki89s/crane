'use strict';

const ipcRenderer = window.ipcRenderer;
const app = window.app;
const store = window.store;

const video_id_send_button = document.getElementById('video_id_send_button');
const yt_api_key_button = document.getElementById('yt_api_key_button');
const dl_api_key_button = document.getElementById('dl_api_key_button');
const google_credentials_button = document.getElementById('google_credentials_button');
const talk_message_switch = document.getElementById('switch_input');
const talk_message_display_switch = document.getElementById('switch_display_input');
var speechinfo = new SpeechSynthesisUtterance();
var last_message = '';

document.querySelector('.message-box').onanimationend = () => {
  document.querySelector('.message-box').classList.remove('fade-in');
};

function VoiceInitialize(){
  var voices = window.speechSynthesis.getVoices();
  var voice = voices.find(function(voice){return voice.name == "Kyoko"});
  if(voice) speechinfo.voice = voice;
  speechinfo.volume = 1.0;
  speechinfo.rate = 1.0;
  speechinfo.lang = "ja-JP";
  speechinfo.pitch = 1.0;
  speechinfo.text = "ボイスを初期化しました";

  if(store.get('talk_message_read_voice_flag') == 1){
    window.speechSynthesis.speak(speechinfo);
    document.getElementById('switch_read_voice_input').checked = true
  }else{
    document.getElementById('switch_read_voice_input').checked = false
  }


  if(store.get('talk_message_display_flag') == 1){
    document.getElementById('talk-message-box').style.visibility = "visible"
    document.getElementById('switch_display_input').checked = true
  }else{
    document.getElementById('talk-message-box').style.visibility = "hidden"
  }

  document.getElementById('yt_api_key_text_area').value = store.get('yt_api_key') == "" ? "未設定" : "設定されています";
  document.getElementById('dl_api_key_text_area').value = store.get('dl_api_key') == "" ? "未設定" : "設定されています";
  document.getElementById('google_credentials_text_area').value = store.get('google_credentials') == "" ? "未設定" : "設定されています";
};
VoiceInitialize();


// ===============
// アクションの宣言
// ===============
video_id_send_button.addEventListener('click', function (clickEvent) {
  ipcRenderer.send('video_send', document.getElementById('video_id_text_area').value);
})

yt_api_key_button.addEventListener('click', function (clickEvent) {
  store.set('yt_api_key', document.getElementById('yt_api_key_text_area').value);
  document.getElementById('yt_api_key_text_area').value = "";
})

dl_api_key_button.addEventListener('click', function (clickEvent) {
  store.set('dl_api_key', document.getElementById('dl_api_key_text_area').value);
  document.getElementById('dl_api_key_text_area').value = "";
})

google_credentials_button.addEventListener('click', function (clickEvent) {
  store.set('google_credentials', document.getElementById('google_credentials_text_area').value);
  document.getElementById('google_credentials_text_area').value = "";
})

document.getElementById('switch_input').addEventListener('click', function(){
  if(store.get('talk_message_flag') == null){ store.set('talk_message_flag', 0) }
  if(store.get('talk_message_flag') == 1){
    store.set('talk_message_flag', 0);
  }else{
    store.set('talk_message_flag', 1);
    ipcRenderer.send('start_talk_message');
  }
})

document.getElementById('switch_display_input').addEventListener('click', function(){
  if(store.get('talk_message_display_flag') == null){ store.set('talk_message_display_flag', 0) }
  if(store.get('talk_message_display_flag') == 1){
    store.set('talk_message_display_flag', 0);
    document.getElementById('talk-message-box').style.visibility = "hidden"
  }else{
    store.set('talk_message_display_flag', 1);
    document.getElementById('talk-message-box').style.visibility = "visible"
  }
})

document.getElementById('switch_read_voice_input').addEventListener('click', function(){
  if(store.get('talk_message_read_voice_flag') == null){ store.set('talk_message_read_voice_flag', 0) }
  if(store.get('talk_message_read_voice_flag') == 1){
    store.set('talk_message_read_voice_flag', 0);
  }else{
    store.set('talk_message_read_voice_flag', 1);
  }
})

// ===============
// CallBacks
// ===============

ipcRenderer.on('stream_text', (event, arg) => {
  document.getElementById('talk-message-text').textContent = arg;
})

ipcRenderer.on('stream_EN_text', (event, arg) => {
  document.getElementById('talk-message-EN-text').textContent = arg;
})

ipcRenderer.on('stream_ZH_text', (event, arg) => {
  document.getElementById('talk-message-ZH-text').textContent = arg;
})

ipcRenderer.on('stream_FR_text', (event, arg) => {
  document.getElementById('talk-message-FR-text').textContent = arg;
})

ipcRenderer.on('stream_ES_text', (event, arg) => {
  document.getElementById('talk-message-ES-text').textContent = arg;
})

ipcRenderer.on('stream_PT_text', (event, arg) => {
  document.getElementById('talk-message-PT-text').textContent = arg;
})

ipcRenderer.on('stream_DE_text', (event, arg) => {
  document.getElementById('talk-message-DE-text').textContent = arg;
})

ipcRenderer.on('stream_en_text', (event, arg) => {
  document.getElementById('ping-pong-test').innerHTML += 'ping-pong-test';
})

ipcRenderer.on('asynchronous-reply', (event, arg) => {
  const message = `${arg}\n`
  document.getElementById('async-reply').innerHTML += message
})

ipcRenderer.on('video_send_callback', (event, arg) => {
  document.querySelector('.message-box').classList.remove('fade-in');
  document.getElementById("author-name").innerText = "書き込み偏光くん";
  document.getElementById("display-message").innerText = "メッセージを書き換えたぞ！";
  document.getElementById("author-thumbnail").src = "http://arch.casio.jp/image/dc/images/fh20_gallery_pic04_b.jpg";
  document.querySelector('.message-box').classList.add('fade-in');
})

ipcRenderer.on('livechat_callback', (event, arg) => {
    var words = `${arg}`.split('||||');
    var last_message  = words[0];
    var lastAuthor   = words[1];
    var lastImageUrl = words[2];

    document.getElementById("author-name").textContent = lastAuthor;
    document.getElementById("display-message").textContent = last_message;
    document.getElementById("author-thumbnail").src = lastImageUrl;
    speechinfo.text = last_message;
    if(store.get('talk_message_read_voice_flag') == 1){
      window.speechSynthesis.speak(speechinfo);
    }
    document.querySelector('.message-box').classList.add('fade-in');
  }
)

ipcRenderer.on('livechat_trans_callback', (event, arg) => {
  document.getElementById("display-trans-EN-message").textContent = arg;
})

ipcRenderer.on('livechat_trans_callback_second', (event, arg) => {
  document.getElementById("display-trans-PT-message").textContent = arg;
})

ipcRenderer.on('chat', (event, arg) => {
  const message = `${arg}\n`
  document.getElementById('chat').innerHTML += message
})

