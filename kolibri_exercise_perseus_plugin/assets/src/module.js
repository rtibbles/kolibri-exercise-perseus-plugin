
const ContentRendererModule = require('content_renderer_module');
const ExerciseComponent = require('./views/index');
// Add window.btoa polyfill
global.btoa = global.btoa ? global.btoa : require('btoa');

class ExercisePerseusModule extends ContentRendererModule {
  get rendererComponent() {
    return ExerciseComponent;
  }
}

module.exports = new ExercisePerseusModule();
