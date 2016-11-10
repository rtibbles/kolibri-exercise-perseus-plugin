<template>

  <div>
    <div id="perseus">
      <div id="problem-area">
        <div id="workarea"></div>
      </div>
      <div id="hintlable" v-if="hinted">{{ $tr("hintLable") }}</div>
      <div id="hintsarea"></div>
      <div style="clear: both;"></div>
    </div>
    <div id="answer-area-wrap">
      <div id="answer-area">
        <div class="info-box">
          <div id="solutionarea"></div>
          <icon-button @click="checkAnswer" v-if="!complete" class="question-btn" id="check-answer-button">{{ checkText }}</icon-button>
          <icon-button @click="nextQuestion" v-if="complete && passNum >= 1" class="question-btn" id="next-question-button">{{ $tr("correct") }}</icon-button>
          <icon-button v-if="availableHints > 0" @click="takeHint" class="hint-btn">
            <svg class="lightbulb" src="./lightbulb_black.svg"></svg>{{ $tr("hint") }}
          </icon-button>
          <icon-button v-else class="hint-btn" disabled>
            <svg class="lightbulb disabled" src="./lightbulb_black.svg"></svg>{{ $tr("noMoreHint") }}
          </icon-button>
          <div style="clear: both"></div>
        </div>
      </div>
    </div>
    <div id="scratchpad-btn-container">
      <icon-button v-if="scratchpad" id="scratchpad-show">{{ $tr("showScratch") }}</icon-button>
      <icon-button v-else disabled id="scratchpad-not-available">{{ $tr("notAvailable") }}</icon-button>
    </div>
    <div v-el:perseus-container id="perseus-container"></div>
  </div>

</template>


<script>

  const coreActions = require('kolibri.coreVue.vuex.actions');

  // keep references to these globally polluting libraries
  // so that we can pollute the global again when necessary.
  let i18nReference = undefined;
  let jqueryReference = undefined;
  let reactReference = undefined;

  module.exports = {
    init() {
      // Perseus expects React to be available on the global object
      // we save what ever is using this global name and assign it back
      // when this component is destroied.
      this.backupReact = global.React;
      if (reactReference) {
        // if this is not the first time, we will have a reference to this library.
        this.react = global.React = reactReference;
      } else {
        // if this is the first time, load library.
        this.react = global.React = require('react');
      }

      // Perseus expects ReactDOM to be in a particular place on the React object.
      global.React.__internalReactDOM = require('react-dom');
      this.reactDOM = global.ReactDOM = global.React.__internalReactDOM;

      // Add in a couple of addons that Perseus needs.
      global.React.addons = global.React.__internalAddons = {
        CSSTransitionGroup: require('react-addons-css-transition-group'),
        PureRenderMixin: require('react-addons-pure-render-mixin'),
      };

      // Perseus also expects katex to be globally imported.
      global.katex = require('perseus/lib/katex/katex');

      // Underscore as well! We use their bundled version for compatibility reasons.
      global._ = require('perseus/lib/underscore');

      // same treatment as loading React.
      this.backup$ = global.$;
      if (jqueryReference) {
        global.$ = jqueryReference;
      } else {
        // Load in jQuery, because apparently we still need that for a React app.
        require('perseus/lib/jquery');
      }

      // same treatment as loading React.
      this.backupI18N = global.i18n;
      if (i18nReference) {
        global.i18n = i18nReference;
      } else {
        // Perseus expects this i18n object, but hopefully we won't have to touch it
        // We should try to only use our interface text, so as to avoid interacting with this.
        require('perseus/lib/i18n');
      }

      // For reasons quite beyond my ken, some configuration is still delegated to this
      // global Exercises object.
      this.Exercises = global.Exercises = {
        useKatex: true,
      };

      this.perseus = require('perseus/build/perseus');

      // A handy convenience mapping to what is essentially a constructor for Item Renderer
      // components.
      this.itemRendererFactory = this.react.createFactory(this.perseus.ItemRenderer);
    },

    beforeDestroy() {
      // Clean up any existing itemRenderer to avoid leak memory
      // https://facebook.github.io/react/blog/2015/10/01/react-render-and-top-level-api.html
      this.reactDOM.unmountComponentAtNode(this.$els.perseusContainer);
    },

    destroyed() {
      // Clean up the global namespace pollution that Perseus necessitates.

      // Save the reference of the loaded library.
      reactReference = global.React;
      // Assign the global name back to its original object.
      global.React = this.backupReact;

      jqueryReference = global.$;
      global.$ = this.backup$;

      i18nReference = global.i18n;
      global.i18n = this.backupI18N;

      delete global.ReactDOM;
      delete global.Exercises;
    },

    $trNameSpace: 'perseus',
    $trs: {
      showScratch: 'Show scratchpad',
      notAvailable: 'Scratchpad not available',
      loading: 'Loading',
      check: 'Check Answer',
      correct: 'Next Question',
      incorrect: 'Sorry, try again',
      hint: 'Get a hint',
      hintLable: 'Hint:',
      noMoreHint: 'No more hint',
    },
    props: {
      scratchpad: {
        type: Boolean,
        default: false,
      },
      initialHintsVisible: {
        type: Number,
        default: 0,
      },
      item: {
        type: Object,
        validator: (obj) => [
          // A somewhat protracted validator to ensure that our item data conforms
          // to that expected by the Perseus ItemRenderer,
          // c.f. https://github.com/Khan/perseus/blob/master/src/item-renderer.jsx#L35
          'calculator',
          'chi2Table',
          'periodicTable',
          'tTable',
          'zTable',
        ].reduce(
            // Loop through all of the above properties and ensure that if the 'answerArea'
            // property of the item has them, then their values are set to Booleans.
            (prev, key) => !(!prev ||
              obj.answerArea.hasOwnProperty(key) &&
              typeof obj.answerArea[key] !== 'boolean'), true) &&
            // Check that the 'hints' property is an Array.
          Array.isArray(obj.hints) &&
          obj.hints.reduce(
            // Check that each hint in the hints array is an object (and not null)
            (prev, item) => item && typeof item === 'object', true) &&
          // Check that the question property is an object (and not null)
          obj.question && typeof obj.question === 'object',
        required: true,
      },
      problemNumber: {
        type: Number,
        default: 1,
      },
      passRatioM: {
        type: Number,
        default: 3,
      },
      passRatioN: {
        type: Number,
        default: 2,
      },
    },
    data: () => ({
      // Is the perseus item renderer loading?
      loading: true,
      // Is the current answer correct?
      correct: false,
      // Can move to next question?
      complete: false,
      // Has an answer been submitted?
      empty: true,
      // has the user used the hint?
      hinted: false,
      // is first attempt?
      firstAttempt: true,
      // number of available hints
      availableHints: 0,
    }),

    methods: {
      renderItem() {
        // Reset the state tracking variables.
        this.empty = this.loading = true;
        this.correct = false;
        this.complete = false;

        if (this.itemRenderer) {
          // reset the state of the react component.
          // Otherwise props like hintsVisible left from previous question
          // will get current question's hint revealed.
          this.itemRenderer.setState(this.itemRenderer.getInitialState());
        }

        // Create react component with current item data.
        // If the component already existed, this will perform an update.
        this.itemRenderer =
        this.reactDOM.render( // eslint-disable-line new-cap
          this.itemRendererFactory(this.itemRenderData, null),
          this.$els.perseusContainer, () => { this.loading = false; }
        );
      },
      checkAnswer() {
        if (this.itemRenderer) {
          const check = this.itemRenderer.scoreInput();
          this.empty = check.empty;
          if (!check.empty) {
            this.complete = check.correct;
            this.correct = this.hinted || !this.firstAttempt ? false : check.correct;
            this.$parent.$emit(
              'updateAMLogs',
              this.correct,
              this.complete,
              this.firstAttempt,
              this.hinted
            );
            let exercisePassed = false;
            if (this.correct) {
              if (this.passNum === 0) {
                // passNum reached 0 means pass the exercise.
                this.updateExerciseProgress(this.Kolibri, 1);
                exercisePassed = true;
                this.$emit('exercisepassed');
              } else {
                if (this.summaryprogress === 0) {
                  this.updateExerciseProgress(this.Kolibri, 0.5, true);
                }
              }
            }
            this.$parent.$emit('saveAMLogs', exercisePassed);
            this.$emit('answerchecked');
            this.firstAttempt = false;
          }
        }
      },
      nextQuestion() {
        this.hinted = false; // reset hinted.
        this.firstAttempt = true; // reset firstAttempt.
        this.$parent.$emit('toNextQuestion');
      },
      takeHint() {
        if (this.itemRenderer) {
          this.itemRenderer.showHint();
          this.hinted = true;
          this.$parent.$emit('takehint', this.firstAttempt, this.hinted);
          this.$emit('hinttaken');
          this.firstAttempt = false;
          this.availableHints -= 1;
        }
      },
    },

    computed: {
      passNum() {
        if (this.pastattempts) {
          if (this.pastattempts.length > this.passRatioN) {
            return this.passRatioM - this.pastattempts.slice(0, this.passRatioN).reduce(
              (a, b) => a + b.correct, 0);
          }
          return this.passRatioM - this.pastattempts.reduce((a, b) => a + b.correct, 0);
        }
        return this.passRatioN;
      },
      checkText() {
        return this.empty ? this.$tr('check') : this.$tr('incorrect');
      },
      itemRenderData() {
        return {
          // A property to return data formatted in the form expected by the Item Renderer
          // constructor function.
          initialHintsVisible: this.initialHintsVisible,
          item: this.item,
          workAreaSelector: '#workarea',
          problemAreaSelector: '#problem-area',
          problemNum: this.problemNumber,
          enabledFeatures: {
            highlight: true,
            toolTipFormats: true,
          },
        };
      },
    },

    ready() {
      // Do a first render with current available item data
      this.renderItem();
      // init the availableHints;
      this.availableHints = this.item.hints.length;

      this.$watch('item', () => {
        // Rerender when item data changes
        if (this.item) {
          this.renderItem();
          this.availableHints = this.item.hints.length;
        }
      });
    },

    vuex: {
      actions: {
        updateExerciseProgress: coreActions.updateExerciseProgress,
      },
      getters: {
        pastattempts: (state) => state.core.logging.mastery.pastattempts,
        summaryprogress: (state) => state.core.logging.summary.progress,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  #perseus
    @import '../../../node_modules/perseus/stylesheets/local-only/khan-exercise.css'
    @import '../../../node_modules/perseus/lib/katex/katex.css'
    @import '../../../node_modules/perseus/build/perseus.css'
    @import '../../../node_modules/perseus/lib/mathquill/mathquill.css'

  #perseus
    border-radius: 10px
    padding: 15px
    background-color: $core-bg-light
    margin-top: 6px

  #answer-area-wrap
    position: relative
    top: 70%

  #workarea
    margin-left: 0

  .info-box
    margin-bottom: 10
    padding: 10
    position: relative
    z-index: 10
    overflow: visible

  #hintsarea
    border-radius: 4px

  #hintlable
    font-weight: bold
    padding: 10px
    border-top: 1px solid

  .hint-btn
    float: right
    padding-left: 16px
    padding-right: 16px

  .lightbulb
    fill: $core-text-annotation

  .disabled
    fill: #dfdfdf

  #solutionarea
    min-height: 35px
    padding: 10px
    margin: 0 -10px
    border-bottom: 0
    overflow: visible

  .question-btn
    float: left
    background-color: $core-action-normal
    color: $core-bg-light
    padding-left: 16px
    padding-right: 16px

</style>


<style lang="stylus">

  // Use namespaced unscoped styling here to alter Perseus' original styling in order to fit kolibri
  #perseus

    img
      width: 100%
      height: 100%
      max-width: 600px
      padding: 10px

    ul
      border-bottom: 0
      border-top: 0

    fieldset
      border: none

    fieldset > ul
      border: 1px solid #BABEC2
      border-radius: 10px
      padding: 0

    fieldset > ul > li
      list-style-type: none

    .perseus-hint-renderer
      color: #686868
      padding: 6px 10px
      font-weight: normal

    .perseus-hint-renderer
      margin-left: 40px

    .perseus-hint-label
      color: #686868
      font-weight: 600
      white-space: nowrap
      right: 50px
      position: relative
      font-weight: bold

    .perseus-hint-label:before
      content: '('

    .perseus-hint-label:after
      content: ')'

    .paragraph
      padding: 4px

    .fixed-to-responsive
      display: inline-block

    // Perseus will add padding-bottom: 100 to every svg-image, we don't want that.
    // @stylint off
    .svg-image *
      padding-bottom: 0 !important
    // @stylint on

</style>
