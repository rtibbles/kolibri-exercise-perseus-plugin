
const ContentRendererModule = require('kolibri.coreModules.contentRenderer');
const ExerciseComponent = require('./vue/index');
// Add window.btoa polyfill
global.btoa = global.btoa ? global.btoa : require('btoa');

class ExercisePerseusModule extends ContentRendererModule {
  get rendererComponent() {
    return ExerciseComponent;
  }
  get contentType() {
    return 'exercise/perseus';
  }
}

module.exports = new ExercisePerseusModule();
