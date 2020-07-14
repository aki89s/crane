# Crane
## Description
Translate your words into another language in real time.

## How to use
Clone the repository and add the .env file to the repository
```shell=
$ git clone
$ cd crane
$ touch .env
```

like this
```shell=
GOOGLE_APPLICATION_CREDENTIALS=".credentials/speechtotext-112345-1234567qwert.json"
SPEECH_TO_TEXT_API_KEY="qwertyuiop"
DEEPL_API_KEY="asdfgh-zxcv-nmjk-tyuio-123456789"
```

*In order to use this application, you need to have GCP create a project and an API key and DeepL API key in advance, using the It must be done.*

## Start
```shell=
$ npm install
$ npm start
```
