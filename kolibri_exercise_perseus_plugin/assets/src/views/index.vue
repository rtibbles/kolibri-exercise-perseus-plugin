<template v-if="itemId">

  <div>
    <div ref="perseus" id="perseus">
      <div id="problem-area">
        <div id="workarea"></div>
      </div>
      <div id="hintlabel" v-if="hinted">{{ $tr("hintLabel") }}</div>
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
          <div v-if="anyHints">
            <icon-button v-if="availableHints > 0" @click="takeHint" class="hint-btn" :text="$tr('hint')"></icon-button>
            <icon-button v-else class="hint-btn" disabled :text="$tr('noMoreHint')"></icon-button>
          </div>
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

  const logging = require('kolibri.lib.logging').getLogger(__filename);

  // because MathJax isn't compatible with webpack, we are loading it this way.
  const scriptLoadHack = document.createElement('script');
  const configFileName = require('../constants').ConfigFileName;
  // the config is fragile, Khan may change it and we need to update the following hardcoded path.
  scriptLoadHack.setAttribute('src', `/static/mathjax/2.1/MathJax.js?config=${configFileName}`);
  document.head.appendChild(scriptLoadHack);

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
      this.clearItemRenderer();
      this.$emit('stopTracking');
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
    $trNameSpace: 'perseusRenderer',
    $trs: {
      showScratch: 'Show scratchpad',
      notAvailable: 'The scratchpad is not available',
      loading: 'Loading',
      hint: 'Get a hint',
      hintLabel: 'Hint:',
      noMoreHint: 'No more hints',
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    name: 'exercise-perseus-renderer',
    props: {
      scratchpad: {
        type: Boolean,
        default: false,
      },
      initialHintsVisible: {
        type: Number,
        default: 0,
      },
      problemNumber: {
        type: Number,
        default: 1,
      },
      defaultFile: {
        type: Object,
        required: true,
      },
      itemId: {
        type: String,
        required: true,
      },
      answerState: {
        type: Object,
        default: {},
      },
      allowHints: {
        type: Boolean,
        default: true,
      },
    },
    data: () => ({
      // Is the perseus item renderer loading?
      loading: true,
      // state about the answer
      message: null,
      // default item data
      item: {},
      itemRenderer: null,
    }),
    methods: {
      validateItemData(obj) {
        return [
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
          obj.question && typeof obj.question === 'object';
          /* eslint-enable no-mixed-operators */
      },
      renderItem() {
        // Reset the state tracking variables.
        this.loading = true;

        // Create react component with current item data.
        // If the component already existed, this will perform an update.
        this.$set(this, 'itemRenderer', this.reactDOM.render(
          this.itemRendererFactory(this.itemRenderData, null),
          this.$refs.perseusContainer, () => {
            this.loading = false;
          })
        );
      },
      clearItemRenderer() {
        // Clean up any existing itemRenderer to avoid leak memory
        // https://facebook.github.io/react/blog/2015/10/01/react-render-and-top-level-api.html
        // Nest this in a try catch block so that we can call this method aggressively
        // to ensure clean up without worrying about whether React has already cleaned up this
        // component.
        try {
          this.reactDOM.unmountComponentAtNode(this.$refs.perseusContainer);
          this.$set(this, 'itemRenderer', null);
        } catch (e) {
          logging.debug('Error during unmounting of item renderer', e);
        }
      },
      setAnswer() {
        // If a passed in answerState is an object with the right keys, restore.
        if (this.itemRenderer &&
          this.answerState &&
          this.answerState.question &&
          this.answerState.hints &&
          !this.loading) {
          this.itemRenderer.restoreSerializedState(this.answerState);
        }
      },
      checkAnswer() {
        if (this.itemRenderer && !this.loading) {
          const check = this.itemRenderer.scoreInput();
          this.empty = check.empty;
          if (check.message && check.empty) {
            this.message = check.message;
          } else if (!check.empty) {
            const answerState = this.itemRenderer.getSerializedState();
            const simpleAnswer = check.guess;
            return {
              correct: check.correct,
              answerState,
              simpleAnswer,
            };
          }
        }
        return null;
      },
      takeHint() {
        if (this.itemRenderer &&
          this.itemRenderer.state.hintsVisible < this.itemRenderer.getNumHints()) {
          this.itemRenderer.showHint();
          this.$parent.$emit('hintTaken', { answerState: this.itemRenderer.getSerializedState() });
        }
      },
      interactionCallback() {
        this.$emit('interaction');
        this.dismissMessage();
      },
      dismissMessage() {
        // dismiss the error message when user click anywhere inside the perseus element.
        this.message = null;
      },
      loadItemData() {
        // Only try to do this if itemId is defined.
        if (this.itemId) {
          this.loading = true;
          this.Kolibri.client(
            `${this.defaultFile.storage_url}${this.itemId}.json`
            ).then((itemResponse) => {
              if (this.validateItemData(itemResponse.entity)) {
                this.item = itemResponse.entity;
                // init the availableHints;
                if (this.$el) {
                  // Don't try to render if our component is not mounted yet.
                  this.renderItem();
                } else {
                  this.$once('mounted', this.renderItem);
                }
              } else {
                logging.warn('Loaded item was malformed', itemResponse.entity);
              }
            }).catch(reason => {
              logging.debug('There was an error loading the assessment item data: ', reason);
              this.clearItemRenderer();
              this.$emit('itemError', reason);
            });
        }
      },
    },
    computed: {
      itemRenderData() {
        return {
          // A property to return data formatted in the form expected by the Item Renderer
          // constructor function.
          initialHintsVisible: 0,
          item: this.item,
          workAreaSelector: '#workarea',
          problemAreaSelector: '#problem-area',
          problemNum: this.problemNumber,
          enabledFeatures: {
            highlight: true,
            toolTipFormats: true,
          },
          apiOptions: {
            // Pass in callbacks for widget interaction and focus change.
            // Here we dismiss answer error message on interaction and focus change.
            interactionCallback: this.interactionCallback,
            onFocusChange: this.dismissMessage,
          },
        };
      },
      hinted() {
        return this.itemRenderer ? this.itemRenderer.state.hintsVisible > 0 : false;
      },
      availableHints() {
        return this.itemRenderer ? this.itemRenderer.getNumHints() -
        this.itemRenderer.state.hintsVisible : 0;
      },
      anyHints() {
        return this.allowHints && (this.itemRenderer ? this.itemRenderer.getNumHints() : 0);
      },
    },
    watch: {
      itemId: 'loadItemData',
      loading: 'setAnswer',
      answerState: 'setAnswer',
    },
    created() {
      this.loadItemData();
      this.$emit('startTracking');
    },
    mounted() {
      this.$emit('mounted');
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

  #hintlabel
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
