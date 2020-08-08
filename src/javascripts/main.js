'use strict';

const appRootDir = require('app-root-dir').get();
const log = require('electron-log');
log.transports.file.level = 'info';
log.transports.file.file = appRootDir + '/log.log';

const { platform } = require("os");
const path = require("path");
console.log({ msg: "configure PATH...", path: process.env["PATH"], appRootDir });
switch (platform()) {
  case "darwin":
    // for release build
    const appName = "crane.app";
    process.env["PATH"] += ":" + `/Applications/${appName}/Contents/Resources/bin/`;

    // for release build without install
    process.env["PATH"] += ":" + path.join(appRootDir, "..", "bin");

    // for develop build
    process.env["PATH"] +=
      ":" + path.join(appRootDir, "resources", "mac", "bin");
    break;
  case "win32":
    // for release build
    process.env["PATH"] += ";" + path.join(appRootDir, "..", "bin");
    break;
  default:
    console.error("未知のプラットフォームが検出されました。");
}
console.log({ msg: "PATH configured!", path: process.env["PATH"], appRootDir });

const { app, Menu, BrowserWindow, ipcMain, net } = require("electron");
const recorder = require('node-record-lpcm16');
const speech = require('@google-cloud/speech');
const chalk = require('chalk');
const { Writable } = require('stream');
const dotenv = require('dotenv');
dotenv.config();
const Store = require("electron-store");
const store = new Store();

// SpeechToText用の credentials.json のパスを設定する
process.env["GOOGLE_APPLICATION_CREDENTIALS"] = store.get('google_credentials');

const streamingLimit = 180000;
const sampleRateHertz = 16000;
const request = {
  config: {
    encoding: 'LINEAR16',
    sampleRateHertz: sampleRateHertz,
    languageCode: 'ja-JP',
  },
  interimResults: true,
};

let recognizeStream = null;
let restartCounter = 0;
let audioInput = [];
let lastAudioInput = [];
let resultEndTime = 0;
let isFinalEndTime = 0;
let finalRequestEndTime = 0;
let newStream = true;
let bridgingOffset = 0;
let lastTranscriptWasFinal = false;

var last_message = '';

function startStream() {
  audioInput = [];
  recognizeStream = new speech.SpeechClient()
    .streamingRecognize(request)
    .on('error', err => {
      if (err.code === 11) {
        // restartStream();
      } else {
        console.error('API request error ' + err);
      }
    })
    .on('data', speechCallback);

  setTimeout(restartStream, streamingLimit);
}

const speechCallback = stream => {
  resultEndTime =
    stream.results[0].resultEndTime.seconds * 1000 +
    Math.round(stream.results[0].resultEndTime.nanos / 1000000);

  const correctedTime =
    resultEndTime - bridgingOffset + streamingLimit * restartCounter;

  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  let stdoutText = '';
  if (stream.results[0] && stream.results[0].alternatives[0]) {
    stdoutText = stream.results[0].alternatives[0].transcript;
  }

  if (stream.results[0].isFinal) {
    process.stdout.write(chalk.green(`${stdoutText}\n`));

    mainWindow.webContents.send("stream_text", stdoutText);

    translate(stdoutText, 'EN');
    translate(stdoutText, 'ZH');
    translate(stdoutText, 'FR');
    translate(stdoutText, 'ES');
    translate(stdoutText, 'PT');
    translate(stdoutText, 'DE');

    isFinalEndTime = resultEndTime;
    lastTranscriptWasFinal = true;
  } else {
    if (stdoutText.length > process.stdout.columns) {
      stdoutText = stdoutText.substring(0, process.stdout.columns - 4) + '...';
    }
    process.stdout.write(chalk.red(`${stdoutText}`));
    mainWindow.webContents.send("stream_text", stdoutText);

    lastTranscriptWasFinal = false;
  }
};

const audioInputStreamTransform = new Writable({
  write(chunk, encoding, next) {
    if (newStream && lastAudioInput.length !== 0) {
      const chunkTime = streamingLimit / lastAudioInput.length;
      if (chunkTime !== 0) {
        if (bridgingOffset < 0) {
          bridgingOffset = 0;
        }
        if (bridgingOffset > finalRequestEndTime) {
          bridgingOffset = finalRequestEndTime;
        }
        const chunksFromMS = Math.floor(
          (finalRequestEndTime - bridgingOffset) / chunkTime
        );
        bridgingOffset = Math.floor(
          (lastAudioInput.length - chunksFromMS) * chunkTime
        );

        for (let i = chunksFromMS; i < lastAudioInput.length; i++) {
          recognizeStream.write(lastAudioInput[i]);
        }
      }
      newStream = false;
    }

    audioInput.push(chunk);

    if (recognizeStream) {
      recognizeStream.write(chunk);
    }
    next();
  },

  final() {
    if (recognizeStream) {
      recognizeStream.end();
    }
  },
});

function restartStream() {
  if (recognizeStream) {
    recognizeStream.removeListener('data', speechCallback);
    recognizeStream = null;
  }
  if (resultEndTime > 0) {
    finalRequestEndTime = isFinalEndTime;
  }
  resultEndTime = 0;

  lastAudioInput = [];
  lastAudioInput = audioInput;

  restartCounter++;

  if (!lastTranscriptWasFinal) {
    process.stdout.write('\n');
  }
  process.stdout.write(
    chalk.yellow(`${streamingLimit * restartCounter}: RESTARTING REQUEST\n`)
  );

  newStream = true;

  if (store.get('talk_message_flag') == 1) {
    startStream();
  }
}

var streaming_title = ''
var active_livechat_id = ''

let mainWindow;
let template = [{
  label: "sample",
  submenu: [{
    label: "アプリを終了",
    accelerator: 'Cmd+Q',
    click: function() {
      app.quit();
    }
  }]
}, {
  label: "window",
  submenu: [{
    label: "最小化",
    accelerator: "Cmd+M",
    click: function() {
      mainWindow.minimize();
    }
  }, {
    label: "最大化",
    accelerator: "Cmd+Ctrl+F",
    click: function() {
      mainWindow.miximize();
    }
  }, {
    label: "リロード",
    accelerator: "Cmd+R",
    click: function(){
      BrowserWindow.getFocusedWindow().reload();
    }
  }],
  label: "Edit",
  submenu: [{ label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
            { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
            { type: "separator" },
            { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
            { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
            { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
            { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }]
}]

var translate = function(message, target_lang){
  var url = "https://api.deepl.com/v2/translate" +
    `?text=${message}` +
    `&target_lang=${target_lang}` +
    `&auth_key=${store.get('dl_api_key')}`

  var options = {
    url: url,
    protocol: 'https:',
    port: 443
  }
  const request = net.request(options);
  request.on('response', (response) => {
    var body = "";
    response.on('data', (chunk) => {
      body += chunk;
    })
    response.on('end', () => {
      var json = JSON.parse(body)
      mainWindow.webContents.send(`stream_${target_lang}_text`, json.translations[0].text);
    })
  })
  request.end()
}

var translation = function(event, message){
  // message が日本語じゃなければ日本語に翻訳
  var is_japanese = message.match(/[\u30a0-\u30ff]/) || message.match(/[\u3040-\u309f]/) ? true : false
  var first_url = "";
  var second_url = "";
  if(is_japanese){
    first_url = "https://api.deepl.com/v2/translate" +
      `?text=${message}` +
      "&target_lang=EN" +
      `&auth_key=${store.get('dl_api_key')}`
    second_url = "https://api.deepl.com/v2/translate" +
      `?text=${message}` +
      "&target_lang=PT" +
      `&auth_key=${store.get('dl_api_key')}`
  }else{
    first_url = "https://api.deepl.com/v2/translate" +
      `?text=${message}` +
      "&target_lang=JA" +
      `&auth_key=${store.get('dl_api_key')}`
    second_url = "https://api.deepl.com/v2/translate" +
      `?text=${message}` +
      "&target_lang=EN" +
      `&auth_key=${store.get('dl_api_key')}`
  }

  var options = {
    url: first_url,
    protocol: 'https:',
    port: 443
  }
  var request = net.request(options);
  request.on('response', (response) => {
    var body = "";
    response.on('data', (chunk) => {
      body += chunk;
    })
    response.on('end', () => {
      var json = JSON.parse(body)
      event.sender.send('livechat_trans_callback', json.translations[0].text);
    })
  })
  request.end()

  options = {
    url: second_url,
    protocol: 'https:',
    port: 443
  }
  request = net.request(options);
  request.on('response', (response) => {
    var body = "";
    response.on('data', (chunk) => {
      body += chunk;
    })
    response.on('end', () => {
      var json = JSON.parse(body)
      event.sender.send('livechat_trans_callback_second', json.translations[0].text);
    })
  })
  request.end()
}

var livechat_read = function(event){
  if(streaming_title != '' && active_livechat_id != ''){
    var url = "https://www.googleapis.com/youtube/v3/liveChat/messages" +
      `?liveChatId=${active_livechat_id}` +
      "&part=authorDetails,snippet" +
      "&maxResults=200" +
      "&hl=ja" +
      `&key=${store.get('yt_api_key')}`

    var options = {
      url: url,
      protocol: 'https:',
      port: 443
    }
    const request = net.request(options);
    request.on('response', (response) => {
      var body = "";
      response.on('data', (chunk) => {
        body += chunk;
      })
      response.on('end', () => {
        var json = JSON.parse(body)
        if(json.items.length != 0){
          var display_message = json.items[json.items.length - 1].snippet.displayMessage;
          if (display_message != last_message){
            last_message = display_message
            var display_name = json.items[json.items.length - 1].authorDetails.displayName;
            var profile_image_url = json.items[json.items.length - 1].authorDetails.profileImageUrl;
            translation(event, display_message)
            var send_message = [display_message, display_name, profile_image_url].join('||||');
            event.sender.send('livechat_callback', send_message)
          }
        }
      })
    })
    request.end()
  }
}

function createWindow(){
  mainWindow = new BrowserWindow({width: 1320, height: 1000,
    minHeight: 1000, maxHeight: 1000,
    minWidth: 1320, maxWidth: 1320,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false,
      preload: __dirname + "/preload.js"
    }
  });
  mainWindow.loadURL('file://' + appRootDir + '/src/html/index.html');
  mainWindow.webContents.openDevTools();
}

app.on("ready", function() {
  const menu = Menu.buildFromTemplate(template);

  Menu.setApplicationMenu(menu);
  createWindow();

  store.set('talk_message_flag', 0);

  recorder
    .record({
      sampleRateHertz: sampleRateHertz,
      threshold: 0.7,
      silence: '1.0',
      keepSilence: true,
      recordProgram: 'sox',
    })
    .stream()
    .on('error', err => {
      console.error('Audio recording error ' + err);
    })
    .pipe(audioInputStreamTransform);
})

app.on("window-all-closed", () => {
  mainWindow = null;
  app.quit();
})

app.on("activate", () => {
  if(BrowserWindow.getAllWindows().length === 0){
    createWindow();
  }
})

// ===============
// GUI Events
// ===============
ipcMain.on('start_talk_message', (event) => {
  startStream();
})

ipcMain.on('video_send', (event, arg) => {
  // APIを叩いて対象のチャットを取得する
  var url = "https://www.googleapis.com/youtube/v3/videos" +
    `?id=${arg}` +
    "&part=liveStreamingDetails,snippet" +
    "&maxResults=1" +
    "&hl=ja" +
    `&key=${store.get('yt_api_key')}`
  var options = {
    url: url,
    protocol: 'https:',
    port: 443
  }
  const request = net.request(options);
  request.on('response', (response) => {
    var body = "";
    response.on('data', (chunk) => {
      body += chunk;
    })
    response.on('end', () => {
      var json = JSON.parse(body)
      streaming_title = json.items[0].snippet.title;
      active_livechat_id = json.items[0].liveStreamingDetails.activeLiveChatId;
      setInterval(function(){livechat_read(event)}, 5000);
    })
  })
  request.end()

  event.sender.send('video_send_callback', 'video_send')
})
