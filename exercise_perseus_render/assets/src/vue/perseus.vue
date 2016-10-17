<template>

  <div id="perseus">
      <div id="problem-area">
        <div id="workarea"></div>
        <div id="hintsarea"></div>
      </div>
      <div id="answer-area-wrap">
          <div id="answer-area">
              <div class="info-box">
                  <div id="solutionarea"></div>
                  <p> {{attemptProgress}} </p>
                  <button @click="checkAnswer" v-if="!correct" id="check-answer-button">{{ checkText }}</button>
                  <button @click="nextQuestion" v-else id="next-question-button">{{ $tr("correct") }}</button>
                  <button @click="nextContent" v-if="complete && passNum < 1" id="next-content-button">{{ $tr("nextContent") }}</button>
                  <button @click="takeHint">
                    {{ $tr("hint") }}
                  </button>
              </div>
          </div>
      </div>
      <div style="clear: both;"></div>
    </div>
    <div id="scratchpad-btn-container">
        <button v-if="scratchpad" id="scratchpad-show">{{ $tr("showScratch") }}</button>
        <button v-else disabled id="scratchpad-not-available">{{ $tr("notAvailable") }}</button>
    </div>
    <div v-el:perseus-container id="perseus-container">
  </div>

</template>


<script>

  module.exports = {
    init() {
      // Perseus expects React to be available on the global object
      this.react = global.React = require('react');

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

      // Take note of the global '$' variable so we can replace it after we remove jQuery
      this.backup$ = global.$;

      // Load in jQuery, because apparently we still need that for a React app.
      require('perseus/lib/jquery');

      // Perseus expects this i18n object, but hopefully we won't have to touch it
      // We should try to only use our interface text, so as to avoid interacting with this.
      require('perseus/lib/i18n');

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

    destroyed() {
      // Clean up the global namespace pollution that Perseus necessitates.
      delete global.React;
      delete global.ReactDOM;
      global.$ = this.backup$;
      delete global.i18n;
      delete global.Exercises;
    },

    $trNameSpace: 'perseus',
    $trs: {
      showScratch: 'Show scratchpad',
      notAvailable: 'Scratchpad not available',
      loading: 'Loading',
      check: 'Check Answer',
      correct: 'Correct! Next Question.',
      incorrect: 'Incorrect, try again.',
      hint: 'Hint',
      nextContent: 'Congrats! Move forward.'
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
    },
    data: () => ({
      // Is the perseus item renderer loading?
      loading: true,
      // Is the current answer correct?
      correct: false,
      // Has an answer been submitted?
      empty: true,
    }),

    methods: {
      renderItem() {
        // Reset the state tracking variables.
        this.empty = this.loading = true;
        this.correct = false;
        // Clean up any existing itemRenderer.
        this.reactDOM.unmountComponentAtNode(this.$els.perseusContainer);

        // Create a new one with current item data.
        this.itemRenderer =
        this.reactDOM.render(this.itemRendererFactory( // eslint-disable-line new-cap
          this.itemRenderData, null), this.$els.perseusContainer, () => {
          this.loading = false;
        });
      },
      checkAnswer() {
        if (this.itemRenderer) {
          const check = this.itemRenderer.scoreInput();
          this.correct = check.correct;
          this.empty = check.empty;
        }
      },
      nextQuestion() {
        this.$emit('nextquestion');
      },
      nextContent() {
        this.$emit('nextcontent');
      },
      takeHint() {
        if (this.itemRenderer) {
          this.itemRenderer.showHint();
        }
      },
    },

    computed: {
      attemptProgress() {
        if (this.pastattempts) {
          if (this.pastattempts.length > 5){
            const lastFiveAttempts = this.pastattempts.slice(Math.max(this.pastattempts.length - this.passRatioM, 1));
            this.passNum = this.passRatioN - lastFiveAttempts.reduce((a,b)=>{return a + b;}, 0);
            return lastFiveAttempts
          } else {
            this.passNum = this.passRatioN - this.pastattempts.reduce((a,b)=>{return a + b;}, 0);
            return this.pastattempts
          }
        }
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
      // Rerender when item data changes
      this.$watch('item', this.renderItem);
      // Do a first render with current item data
      this.renderItem();
    },

    vuex: {
      getters: {
        pastattempts: (state) => state.core.logging.mastery.pastattempts,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri/styles/coreTheme'

  #perseus
    @import '../../../node_modules/perseus/stylesheets/local-only/khan-exercise.css'
    @import '../../../node_modules/perseus/lib/katex/katex.css'
    @import '../../../node_modules/perseus/build/perseus.css'
    @import '../../../node_modules/perseus/lib/mathquill/mathquill.css'

  #perseus
    height: 100%

  #problem-area
    height: 70%
    width: 100%
    border: solid 3px #d5d5d5
    border-radius: 4px
    overflow-x: hidden
    position: absolute;

  #answer-area-wrap
    position: relative
    top: 70%

  #workarea
    margin-left: 0;

  .info-box
    // background: #eee
    // border: 1px solid #aaa
    // color: #333
    margin-bottom: 10
    padding: 10
    position: relative
    z-index: 10
    // box-shadow: 0 1px 2px #ccc
    overflow: visible

  #solutionarea
    min-height: 35px
    padding: 10px
    margin: 0 -10px
    border-bottom: 0
    overflow: visible

</style>

<style lang="stylus">

  img
    max-width:100%;
    max-height:100%;

</style>
