
const ContentRendererModule = require('content_renderer_module');
const ExerciseComponent = require('./vue/index');

class ExercisePerseusModule extends ContentRendererModule {
  get rendererComponent() {
    return ExerciseComponent;
  }
  get contentType() {
    return 'exercise/perseus';
  }
}

module.exports = new ExercisePerseusModule();
