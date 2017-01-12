
const ContentRendererModule = require('content_renderer_module');
const ExerciseComponent = require('./vue/index');
// Add window.btoa polyfill
const btoa = require("btoa");
global.btoa = window.btoa = btoa;

class ExercisePerseusModule extends ContentRendererModule {
  get rendererComponent() {
    return ExerciseComponent;
  }
  get contentType() {
    return 'exercise/perseus';
  }
}

module.exports = new ExercisePerseusModule();
