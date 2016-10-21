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
          <icon-button @click="nextContent" v-if="complete && passNum < 1" class="next-btn" id="next-content-button">{{ $tr("nextContent") }}<svg class="right-arrow" src="./arrow_right.svg"></svg></icon-button>
          <attemptprogress class="attemptprogress" :recent-attempts="recentAttempts" :pass-num="passNum" :pass-ratio-m="passRatioM" :pass-ratio-n="passRatioN"></attemptprogress>
          <icon-button v-if="availableHints > 0" @click="takeHint" id="hint-btn">
            <svg class="lightbulb" src="./lightbulb_black.svg"></svg>{{ $tr("hint") }}
          </icon-button>
          <icon-button v-else id="hint-btn" disabled>
            <svg class="lightbulb disabled" src="./lightbulb_black.svg"></svg>{{ $tr("noMoreHint") }}
          </icon-button>
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
      correct: 'Next Question',
      incorrect: 'Sorry, try again',
      hint: 'Get a hint',
      hintLable: 'Hint:',
      nextContent: 'Next Content',
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
          this.empty = check.empty;
          if (!check.empty) {
            this.complete = check.correct;
            this.correct = this.hinted || !this.firstAttempt ? false : check.correct;
            this.$emit('checkanswer', this.correct, this.complete, this.firstAttempt, this.hinted);
            if (this.correct && this.passNum == 1) {
              // we can reliably predict the passexercise before passNum is updated to meet the condition.
              this.$parent.$emit('passexercise');
            }
          }
        }
        this.firstAttempt = false;
      },
      nextQuestion() {
        this.hinted = false; // reset hinted.
        this.firstAttempt = true; // reset firstAttempt.
        this.$emit('nextquestion');
      },
      nextContent() {
        this.$emit('nextcontent');
      },
      takeHint() {
        if (this.itemRenderer) {
          this.itemRenderer.showHint();
          this.hinted = true;
          this.$parent.$emit('takehint', this.firstAttempt, this.hinted);
          this.firstAttempt = false;
          this.availableHints -= 1;
        }
      },
    },

    computed: {
      lastMAttempts() {
        if (this.pastattempts) {
          return this.pastattempts.slice(0, this.passRatioM);
        }
        return [];
      },
      passNum() {
        if (this.pastattempts.length > this.passRatioM) {
          return this.passRatioN - this.lastMAttempts.reduce((a,b)=>{return a + b.correct;}, 0);
        }
        return this.passRatioN - this.pastattempts.reduce((a,b)=>{return a + b.correct;}, 0);
      },
      recentAttempts() {
        if (!this.pastattempts) {
          return undefined;
        }
        if (this.pastattempts.length > this.passRatioM) {
          return this.lastMAttempts;
        }
        return this.pastattempts;
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
      // init the availableHints;
      this.availableHints = this.item.hints.length;
    },

    components: {
      attemptprogress: require('./attemptprogress'),
      'icon-button': require('kolibri/coreVue/components/iconButton'),
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

  #hint-btn
    float: right
    padding-left: 16px
    padding-right: 16px

  .right-arrow
    fill: $core-bg-light

  .right-arrow:hover
    fill: $core-bg-light

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

  .next-btn
    float: left
    background-color: #4A8DDC
    border-color: #4A8DDC
    color: $core-bg-light
    padding-left: 16px
    padding-right: 6px
    padding-bottom: 0

  .next-btn:hover svg
    fill: $core-bg-light

  .attemptprogress
    position: absolute
    left: 50%
    transform: translate(-50%, 0)

</style>

<style lang="stylus">

  img
    width: 100%
    height: 100%
    max-width: 600px
    padding: 10px

  ul
    border-bottom: 0
    border-top: 0

  fieldset
    border: 0

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
    content: "("

  .perseus-hint-label:after
    content: ")"

</style>
