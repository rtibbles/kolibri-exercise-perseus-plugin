<template>

  <div>
    <div ref="perseus" id="perseus">
      <div id="problem-area">
        <div id="workarea"></div>
      </div>
      <div id="hintlable" v-if="hinted">{{ $tr("hintLable") }}</div>
      <div id="hintsarea"></div>
      <div style="clear: both;"></div>
    </div>
    <transition name="expand">
      <div id="message" v-show="message">{{ message }}</div>
    </transition>
    <div id="answer-area-wrap">
      <div id="answer-area">
        <div class="info-box">
          <div id="solutionarea"></div>
          <icon-button @click="checkAnswer" v-show="!complete" class="question-btn" :class="{shaking: shake}" id="check-answer-button" :text="$tr('check')"></icon-button>
          <transition name="delay">
            <icon-button @click="nextQuestion" v-show="complete" class="question-btn next-question-button" :text="$tr('correct')"></icon-button>
          </transition>
          <icon-button v-if="availableHints > 0" @click="takeHint" class="hint-btn" :text="$tr('hint')"></icon-button>
          <icon-button v-else class="hint-btn" disabled :text="$tr('noMoreHint')"></icon-button>
          <div style="clear: both"></div>
        </div>
      </div>
    </div>
    <div id="scratchpad-btn-container">
      <icon-button v-if="scratchpad" id="scratchpad-show" :text="$tr('showScratch')"></icon-button>
      <icon-button v-else disabled id="scratchpad-not-available" :text="$tr('notAvailable')"></icon-button>
    </div>
    <div ref="perseusContainer" id="perseus-container"></div>
  </div>

</template>


<script>

  // because MathJax isn't compatible with webpack, we are loading it this way.
  const scriptLoadHack = document.createElement('script');
  const configFileName = require('../constants').ConfigFileName;
  // the config is fragile, Khan may change it and we need to update the following hardcoded path.
  scriptLoadHack.setAttribute('src', `/static/mathjax/2.1/MathJax.js?config=${configFileName}`);
  document.head.appendChild(scriptLoadHack);

  const coreActions = require('kolibri.coreVue.vuex.actions');

  module.exports = {
    beforeCreate() {
      // Load in jQuery, because apparently we still need that for a React app.
      global.$ = require('jquery');
      global.jQuery = global.$;

      // Underscore as well! We use their bundled version for compatibility reasons.
      global._ = require('underscore');

      // Perseus expects React to be available on the global object
      this.react = require('react');
      global.React = this.react;

      // Perseus expects ReactDOM to be in a particular place on the React object.
      global.React.__internalReactDOM = require('react-dom');
      this.reactDOM = global.React.__internalReactDOM;
      global.ReactDOM = this.reactDOM;

      // Add in a couple of addons that Perseus needs.
      global.React.__internalAddons = {
        CSSTransitionGroup: require('react-addons-css-transition-group'),
        PureRenderMixin: require('react-addons-pure-render-mixin'),
      };
      global.React.addons = global.React.__internalAddons;
      // Perseus also expects katex to be globally imported.
      global.katex = require('perseus/lib/katex/katex');

      // Add in the Khan Academy parser object too, this automatically registers
      // itself to the global object.
      require('perseus/lib/kas');

      // Load MathQuill
      require('perseus/lib/mathquill/mathquill-basic');

      // Perseus expects this i18n object, but hopefully we won't have to touch it
      // We should try to only use our interface text, so as to avoid interacting with this.
      /* eslint-disable import/no-webpack-loader-syntax */
      global.i18n = require('imports-loader?window=>{}!exports-loader?window.i18n!perseus/lib/i18n');
      /* eslint-enable import/no-webpack-loader-syntax */

      require('qtip2');

      // For reasons quite beyond my ken, some configuration is still delegated to this
      // global Exercises object.
      this.Exercises = {
        useKatex: true,
      };

      global.Exercises = this.Exercises;

      this.perseus = require('perseus/build/perseus');

      // A handy convenience mapping to what is essentially a constructor for Item Renderer
      // components.
      this.itemRendererFactory = this.react.createFactory(this.perseus.ItemRenderer);
    },

    beforeDestroy() {
      // Clean up any existing itemRenderer to avoid leak memory
      // https://facebook.github.io/react/blog/2015/10/01/react-render-and-top-level-api.html
      this.reactDOM.unmountComponentAtNode(this.$refs.perseusContainer);
    },

    destroyed() {
      // Clean up the global namespace pollution that Perseus necessitates.
      delete global.React;
      delete global.$;
      delete global.jQuery;
      delete global.i18n;
      delete global.KAS;
      delete global.MathQuill;
      delete global.ReactDOM;
      delete global.Exercises;
    },

    $trNameSpace: 'perseus',
    $trs: {
      showScratch: 'Show scratchpad',
      notAvailable: 'The scratchpad is not available',
      loading: 'Loading',
      check: 'Check answer',
      correct: 'Next question',
      incorrect: 'Sorry, try again',
      hint: 'Get a hint',
      hintLable: 'Hint:',
      noMoreHint: 'No more hints',
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
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
            /* eslint-disable no-mixed-operators */
            // Loop through all of the above properties and ensure that if the 'answerArea'
            // property of the item has them, then their values are set to Booleans.
            (prev, key) => !(!prev ||
              Object.prototype.hasOwnProperty.call(obj.answerArea, key) &&
              typeof obj.answerArea[key] !== 'boolean'), true) &&
            // Check that the 'hints' property is an Array.
          Array.isArray(obj.hints) &&
          obj.hints.reduce(
            // Check that each hint in the hints array is an object (and not null)
            (prev, item) => item && typeof item === 'object', true) &&
          // Check that the question property is an object (and not null)
          obj.question && typeof obj.question === 'object',
          /* eslint-enable no-mixed-operators */
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
      // state about the answer
      message: null,
      // has the user used the hint?
      hinted: false,
      // is first attempt?
      firstAttempt: true,
      // number of available hints
      availableHints: 0,
      // trigger checkAnswer btn animation
      shake: false,
    }),

    methods: {
      renderItem() {
        // Reset the state tracking variables.
        this.empty = true;
        this.loading = true;
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
          this.$refs.perseusContainer, () => { this.loading = false; }
        );

        // Get all inputs in perseus and add event listeners to them.
        // Here we dismiss answer error message on focus.
        const perseusInputs = this.$refs.perseus.getElementsByTagName('input');
        Array.prototype.forEach.call(perseusInputs, (perseusInput) => {
          perseusInput.addEventListener('focus', this.dismissMessage);
        });
      },
      checkAnswer() {
        if (this.itemRenderer) {
          const check = this.itemRenderer.scoreInput();
          this.empty = check.empty;
          if (check.message && check.empty) {
            this.message = check.message;
          /* eslint-disable no-lonely-if */
          } else {
            this.message = null;
            if (!check.empty) {
              if (!check.correct) {
                // btn animation on incorrect answer.
                if (!this.shake) {
                  setTimeout(() => {
                    this.shake = false;
                  }, 1000);
                  this.shake = true;
                }
              }
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
                  this.updateExerciseProgress(1);
                  exercisePassed = true;
                  this.$emit('exercisepassed');
                } else {
                  if (this.summaryprogress === 0) {
                    this.updateExerciseProgress(0.5, true);
                  }
                }
              }
              this.$parent.$emit('saveAMLogs', exercisePassed);
              this.$emit('answerchecked', check.correct);
              this.firstAttempt = false;
              /* eslint-enable no-lonely-if */
            }
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
          if (this.firstAttempt) {
            // mark as hinted only if the first attempt is taking a hint.
            this.hinted = true;
          }
          this.$parent.$emit('takehint', this.firstAttempt, this.hinted);
          this.$emit('hinttaken');
          this.firstAttempt = false;
          this.availableHints -= 1;
        }
      },
      dismissMessage() {
        // dismiss the error message when user click anywhere inside the perseus element.
        this.message = null;
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

    mounted() {
      this.$nextTick(() => {
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

  @require '~kolibri.styles.theme'

  #perseus
    @import '../../../node_modules/perseus/stylesheets/local-only/khan-exercise.css'
    @import '../../../node_modules/perseus/lib/katex/katex.css'
    @import '../../../node_modules/perseus/build/perseus.css'
    require('css-loader?root=../../../node_modules/perseus/lib/mathquill!../../../node_modules/perseus/lib/mathquill/mathquill.css')

  #perseus
    border-radius: $radius
    padding: 15px
    background-color: $core-bg-light
    margin-top: 6px
    overflow-x: auto

  #answer-area-wrap
    position: relative
    top: 92px
    @media screen and (max-width: $portrait-breakpoint)
      top: -18px

  #workarea
    margin-left: 0

  #message
    background-color: $core-bg-warning
    color: $core-text-default
    border-radius: $radius
    padding: 10px 15px
    margin-top: 6px

  .info-box
    margin-bottom: 10
    padding: 10
    position: relative
    z-index: 10
    overflow: visible

  #hintsarea
    border-radius: $radius

  #hintlable
    font-weight: bold
    padding: 10px
    border-top: 1px solid

  .hint-btn
    float: right
    padding-left: 16px
    padding-right: 16px

  #solutionarea
    min-height: 35px
    padding: 10px
    margin: 0 -10px
    border-bottom: 0
    overflow: visible

  .question-btn
    float: left
    color: $core-bg-light
    padding-left: 16px
    padding-right: 16px

  #check-answer-button
    background-color: $core-action-normal

  .next-question-button
    background-color: #43A047

  // next-question-button transition effect
  .delay-enter-active
    background-color: #43A047
    transition: background-color 1s

  .delay-enter
    background-color: $core-action-normal

  // checkAnswer btn animation
  .shaking
    animation: shake 0.8s cubic-bezier(0.36, 0.07, 0.19, 0.97) both
    transform: translate3d(0, 0, 0)
    backface-visibility: hidden
    perspective: 1000px

  @keyframes shake
    10%, 90%
      transform: translate3d(-1px, 0, 0)
    20%, 80%
      transform: translate3d(2px, 0, 0)
    30%, 50%, 70%
      transform: translate3d(-4px, 0, 0)
    40%, 60%
      transform: translate3d(4px, 0, 0)

  // message transition effect
  .expand-enter-active
    transition: all 1s ease

  .expand-enter
    position: absolute
    opacity: 0

</style>


<style lang="stylus">

  @require '~kolibri.styles.theme'

  // Use namespaced unscoped styling here to alter Perseus' original styling in order to fit kolibri
  #perseus

    img
      max-width: 100%
      padding: 10px
      vertical-align: middle

    ul
      border-bottom: 0
      border-top: 0

    fieldset
      border: none

    fieldset > ul
      border: 1px solid #BABEC2
      border-radius: $radius
      padding: 0

    fieldset > ul > li
      list-style-type: none

    .perseus-hint-renderer
      color: $core-text-annotation
      padding: 6px 10px
      font-weight: normal

    .perseus-hint-renderer
      margin-left: 40px

    .perseus-hint-label
      color: $core-text-annotation
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
