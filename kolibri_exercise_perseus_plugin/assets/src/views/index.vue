<template v-if="itemId">

  <div class="bibliotron-exercise">
    <div :class="{'framework-perseus':true, 'perseus-mobile': isMobile}">
      <div ref="perseus" id="perseus">

        <div id="problem-area">
          <div id="workarea"></div>
        </div>

        <icon-button v-if="anyHints && availableHints > 0" @click="takeHint" class="hint-btn" :text="$tr('hint', {hintsLeft: availableHints})"/>
        <icon-button v-else-if="anyHints" class="hint-btn" disabled :text="$tr('noMoreHint')"/>

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
          </div>
        </div>
      </div>

      <icon-button v-if="scratchpad" id="scratchpad-show" :text="$tr('showScratch')"></icon-button>
      <icon-button v-else disabled id="scratchpad-not-available" :text="$tr('notAvailable')"></icon-button>

      <!-- No idea what this is here for -->
      <div ref="perseusContainer" id="perseus-container"></div>
    </div>
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

  const sorterWidgetRegex = /sorter [0-9]+/;

  const responsiveWindow = require('kolibri.coreVue.mixins.responsiveWindow');

  module.exports = {
    beforeCreate() {
      // Add special Khan global objects

      // Infer the decimal separator for this locale
      const decimal_separator = this.$formatNumber(1.1).replace( // eslint-disable-line camelcase
        new RegExp(this.$formatNumber(1), 'g'));

      // Attempt to infer grouping separator
      const grouping_separator = this.$formatNumber(1000, { // eslint-disable-line camelcase
        useGrouping: true
      }).split().reduce(
        (acc, item) => acc.replace(item, ''), this.$formatNumber(1000));

      // Attempt to infer the minus symbol
      const minus = this.$formatNumber(-1).replace(this.$formatNumber(1), '');

      global.icu = {
        getDecimalFormatSymbols() {
          return {
            decimal_separator,
            grouping_separator,
            minus,
          };
        },
      };

      global.KhanUtil = {
        debugLog() {},
      };

      global.Exercises = {
        useKatex: true,
      };

      global.Khan = {
        Util: global.KhanUtil,
        error() {},
      };

      // Load in jQuery, because apparently we still need that for a React app.
      global.$ = require('jquery');
      global.jQuery = global.$;

      require('perseus/lib/babel-polyfills.min');

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
        createFragment: require('react-addons-create-fragment'),
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
      global.$_ = require('imports-loader?window=>{}!exports-loader?window.$_!perseus/lib/i18n');
      global.$i18nDoNotTranslate = require(
        'imports-loader?window=>{},React=react!exports-loader?window.$i18nDoNotTranslate!perseus/lib/i18n');
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
      delete global.icu;
      delete global.KhanUtil;
      delete global.Exercises;
      delete global.Khan;
      delete global.React;
      delete global.$;
      delete global.jQuery;
      delete global.i18n;
      delete global.$_;
      delete global.$i18nDoNotTranslate;
      delete global.MathQuill;
      delete global.ReactDOM;
      delete global.Exercises;
    },
    mixins: [
      responsiveWindow,
    ],
    $trNameSpace: 'perseusRenderer',
    $trs: {
      showScratch: 'Show scratchpad',
      notAvailable: 'The scratchpad is not available',
      loading: 'Loading',
      hint: 'Use a hint ({hintsLeft, number} left)',
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
      /*
       * Special method to extract the current state of a Perseus Sorter widget
       * as it does not currently properly support getSerializedState
       */
      addSorterState(questionState) {
        this.itemRenderer.getWidgetIds().forEach(id => {
          if (sorterWidgetRegex.test(id)) {
            if (questionState[id]) {
              const sortableComponent = this.itemRenderer.questionRenderer.getWidgetInstance(
                id).refs.sortable;
              questionState[id].options = sortableComponent.getOptions();
            }
          }
        });
        return questionState;
      },
      getSerializedState() {
        const hints = Object.keys(this.itemRenderer.hintsRenderer.refs).map(key =>
            this.itemRenderer.hintsRenderer.refs[key].getSerializedState());
        const question = this.addSorterState(this.itemRenderer.questionRenderer.getSerializedState());
        return {
          question,
          hints,
        };
      },
      restoreSerializedState(answerState) {
        this.itemRenderer.restoreSerializedState(this.answerState);
        this.itemRenderer.getWidgetIds().forEach(id => {
          if (sorterWidgetRegex.test(id)) {
            if (answerState.question[id]) {
              const sortableComponent = this.itemRenderer.questionRenderer.getWidgetInstance(
                id).refs.sortable;
              const newProps = Object.assign(
                {},
                sortableComponent.props,
                {
                  options: answerState.question[id].options,
                }
              );
              sortableComponent.setState({ items: sortableComponent.itemsFromProps(newProps) });
            }
          }
        });
      },
      setAnswer() {
        // If a passed in answerState is an object with the right keys, restore.
        if (this.itemRenderer &&
          this.answerState &&
          this.answerState.question &&
          this.answerState.hints &&
          !this.loading) {
          this.restoreSerializedState(this.answerState);
        } else if (this.itemRenderer && !this.loading) {
          // Not setting an answer state, but need to hide any hints.
          this.itemRenderer.setState({
            hintsVisible: this.initialHintsVisible,
          });
        }
      },
      checkAnswer() {
        if (this.itemRenderer && !this.loading) {
          const check = this.itemRenderer.scoreInput();
          this.empty = check.empty;
          if (check.message && check.empty) {
            this.message = check.message;
          } else if (!check.empty) {
            const answerState = this.getSerializedState();
            // We cannot reliably get simplified answers from Perseus, so don't try.
            const simpleAnswer = '';
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
          this.$parent.$emit('hintTaken', { answerState: this.getSerializedState() });
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
      isMobile() {
        return this.windowSize.breakpoint < 3;
      },
      // this is a nasty hack. Will find a better way
      usesTouch() {
        // using mdn suggestion for most compatibility
        const isMobileBrowser = new RegExp(/Mobi*|Android/);
        return isMobileBrowser.test(window.navigator.userAgent);
      },
      itemRenderData() {
        return {
          // A property to return data formatted in the form expected by the Item Renderer
          // constructor function.
          initialHintsVisible: 0,
          item: this.item,
          workAreaSelector: '#workarea',
          problemAreaSelector: '#problem-area',
          problemNum: Math.floor(Math.random() * 1000),
          enabledFeatures: {
            highlight: true,
            toolTipFormats: true,
          },
          apiOptions: {
            // Pass in callbacks for widget interaction and focus change.
            // Here we dismiss answer error message on interaction and focus change.
            interactionCallback: this.interactionCallback,
            onFocusChange: this.dismissMessage,
            isMobile: this.isMobile,
            customKeypad: this.usesTouch,
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
    @import '../../../node_modules/perseus/lib/mathquill/mathquill.css'
    border-radius: $radius
    padding: 15px
    background-color: $core-bg-light
    margin-top: 6px
    overflow-x: visible

  .bibliotron-exercise
    margin-bottom: 6px

  @font-face
    font-family: Symbola
    src: url(/static/fonts/Symbola.eot)
    src: local('Symbola Regular'), local('Symbola'), url(/static/fonts/Symbola.woff) format('woff'), url(/static/fonts/Symbola.ttf) format('truetype'), url(/static/fonts/Symbola.otf) format('opentype'), url(/static/fonts/Symbola.svg#Symbola) format('svg')

</style>
