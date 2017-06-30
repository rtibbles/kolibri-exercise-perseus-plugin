import ContentRendererModule from 'content_renderer_module'; // eslint-disable-line import/extensions

const ExerciseComponent = require('./views/index');
// Add window.btoa polyfill
global.btoa = global.btoa ? global.btoa : require('btoa');

class ExercisePerseusModule extends ContentRendererModule {
  get rendererComponent() {
    return ExerciseComponent;
  }
}

const exercisePerseusModule = new ExercisePerseusModule();

export default exercisePerseusModule;
