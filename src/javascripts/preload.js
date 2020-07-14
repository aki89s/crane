const electron = require("electron");
const Store = require("electron-store");
const store = new Store();

process.once("loaded", () => {
  global.ipcRenderer = electron.ipcRenderer;
  global.app = electron.remote.app;
  global.store = store;
});
