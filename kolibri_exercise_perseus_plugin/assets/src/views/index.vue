<template v-if="itemId">

  <div class="perseus-root bibliotron-exercise">
    <div :class="{'framework-perseus':true, 'perseus-mobile': isMobile}">
      <div ref="perseus" id="perseus">
        <div class="loader-container">
          <k-linear-loader
            v-show="loading"
            :delay="false"
            type="indeterminate"
          />
        </div>
        <div
          :dir="dir"
          id="problem-area"
        >
          <div id="workarea" :style="isMobile ? { marginLeft: '0px' } : {}"></div>
        </div>

        <div class="hint-btn-container">
          <k-button
            v-if="anyHints && availableHints > 0"
            class="hint-btn"
            appearance="basic-link"
            :text="$tr('hint', {hintsLeft: availableHints})"
            :primary="false"
            @click="takeHint"
          />
          <k-button
            v-else-if="anyHints"
            class="hint-btn"
            appearance="basic-link"
            :text="$tr('noMoreHint')"
            :primary="false"
            :disabled="true"
          />
          <core-info-icon
            class="info-icon"
            tooltipPosition="bottom right"
            :iconAriaLabel="$tr('hintExplanation')"
            :tooltipText="$tr('hintExplanation')"
          />
        </div>


        <div :dir="dir" id="hintlabel" v-if="hinted">{{ $tr("hintLabel") }}</div>
        <div :dir="dir" id="hintsarea" :style="isMobile ? { marginLeft: '0px' } : {}"></div>

        <div style="clear: both;"></div>

      </div>

      <transition name="expand">
        <div :dir="dir" id="message" v-show="message">{{ message }}</div>
      </transition>

      <div :dir="dir" id="answer-area-wrap">
        <div id="answer-area">
          <div class="info-box">
            <div id="solutionarea"></div>
          </div>
        </div>
      </div>

      <k-button
        v-if="scratchpad"
        :primary="false"
        :raised="false"
        id="scratchpad-show"
        :text="$tr('showScratch')"
      />
      <k-button
        v-else
        :primary="false"
        :raised="false"
        disabled
        id="scratchpad-not-available"
        :text="$tr('notAvailable')"
      />

      <!-- Need a DOM mount point for reactDOM to attach to,
        but Perseus renders weirdly so doesn't use this -->
      <div :dir="dir" ref="perseusContainer" id="perseus-container"></div>
    </div>
  </div>

</template>


<script>

  import react from 'react';
  import reactDOM from 'react-dom';
  import client from 'kolibri.client';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import contentRendererMixin from 'kolibri.coreVue.mixins.contentRenderer';
  import * as perseus from 'perseus/src/perseus';
  import { getContentLangDir } from 'kolibri.utils.i18n';
  import kolibri from 'kolibri';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kLinearLoader from 'kolibri.coreVue.components.kLinearLoader';
  import CoreInfoIcon from 'kolibri.coreVue.components.CoreInfoIcon';
  import icu from '../KAGlobals/icu';
  import widgetSolver from '../widgetSolver';

  // A handy convenience mapping to what is essentially a constructor for Item Renderer
  // components.
  const itemRendererFactory = react.createFactory(perseus.ItemRenderer);

  const logging = require('kolibri.lib.logging').getLogger(__filename);

  // because MathJax isn't compatible with webpack, we are loading it this way.
  const mathJaxConfigFileName = require('../constants').ConfigFileName;
  // the config is fragile, Khan may change it and we need to update the following hardcoded path.
  const mathJaxUrl = `/static/mathjax/2.1/MathJax.js?config=${mathJaxConfigFileName}`;

  const mathJaxPromise = kolibri.scriptLoader(mathJaxUrl);

  const sorterWidgetRegex = /sorter [0-9]+/;

  export default {
    name: 'exercisePerseusRenderer',
    components: {
      kButton,
      kLinearLoader,
      CoreInfoIcon,
    },
    mixins: [responsiveWindow, contentRendererMixin],
    data: () => ({
      // Is the perseus item renderer loading?
      loading: true,
      // state about the answer
      message: null,
      // default item data
      item: {},
      itemRenderer: null,
      scratchpad: false,
      // Store a copy of the blank state of a question to clear set answers later
      blankState: null,
    }),
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
            readOnly: !this.interactive,
          },
        };
      },
      hinted() {
        return this.itemRenderer ? this.itemRenderer.state.hintsVisible > 0 : false;
      },
      availableHints() {
        return this.itemRenderer
          ? this.itemRenderer.getNumHints() - this.itemRenderer.state.hintsVisible
          : 0;
      },
      anyHints() {
        return this.allowHints && (this.itemRenderer ? this.itemRenderer.getNumHints() : 0);
      },
      dir() {
        return getContentLangDir(this.lang);
      },
    },
    watch: {
      itemId: 'loadItemData',
      loading: 'setAnswer',
      answerState: 'resetState',
      showCorrectAnswer: 'resetState',
    },
    beforeCreate() {
      icu.setIcuSymbols();
    },

    beforeDestroy() {
      this.clearItemRenderer();
      this.$emit('stopTracking');
    },

    $trs: {
      showScratch: 'Show scratchpad',
      notAvailable: 'The scratchpad is not available',
      loading: 'Loading',
      hint: 'Use a hint ({hintsLeft, number} left)',
      hintExplanation: 'If you use a hint, this question will not be added to your progress',
      hintLabel: 'Hint:',
      noMoreHint: 'No more hints',
    },
    created() {
      const initPromise = mathJaxPromise.then(() =>
        perseus.init({ skipMathJax: true, loadExtraWidgets: true })
      );
      // Try to load the appropriate directional CSS for the particular content
      const cssPromise = this.$options.contentModule.loadDirectionalCSS(this.dir);
      Promise.all([initPromise, cssPromise]).then(() => {
        this.loadItemData();
        this.$emit('startTracking');
      });
    },
    mounted() {
      this.$emit('mounted');
    },
    methods: {
      validateItemData(obj) {
        return (
          [
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
            (prev, key) =>
              !(
                !prev ||
                (Object.prototype.hasOwnProperty.call(obj.answerArea, key) &&
                  typeof obj.answerArea[key] !== 'boolean')
              ),
            true
          ) &&
          // Check that the 'hints' property is an Array.
          Array.isArray(obj.hints) &&
          obj.hints.reduce(
            // Check that each hint in the hints array is an object (and not null)
            (prev, item) => item && typeof item === 'object',
            true
          ) &&
          // Check that the question property is an object (and not null)
          obj.question &&
          typeof obj.question === 'object'
        );
        /* eslint-enable no-mixed-operators */
      },
      renderItem() {
        // Reset the state tracking variables.
        this.loading = true;
        // Don't store blank state for another item.
        this.blankState = null;

        // Create react component with current item data.
        // If the component already existed, this will perform an update.
        this.$set(
          this,
          'itemRenderer',
          reactDOM.render(
            itemRendererFactory(this.itemRenderData, null),
            this.$refs.perseusContainer,
            () => {
              this.loading = false;
            }
          )
        );
      },
      resetState(val) {
        if (!val) {
          this.restoreSerializedState(this.blankState);
        }
        this.setAnswer();
      },
      clearItemRenderer() {
        // Clean up any existing itemRenderer to avoid leak memory
        // https://facebook.github.io/react/blog/2015/10/01/react-render-and-top-level-api.html
        // Nest this in a try catch block so that we can call this method aggressively
        // to ensure clean up without worrying about whether React has already cleaned up this
        // component.
        try {
          reactDOM.unmountComponentAtNode(this.$refs.perseusContainer);
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
              const sortableComponent = this.itemRenderer.questionRenderer.getWidgetInstance(id)
                .refs.sortable;
              questionState[id].options = sortableComponent.getOptions();
            }
          }
        });
        return questionState;
      },
      getSerializedState() {
        const hints = Object.keys(this.itemRenderer.hintsRenderer.refs).map(key =>
          this.itemRenderer.hintsRenderer.refs[key].getSerializedState()
        );
        const question = this.addSorterState(
          this.itemRenderer.questionRenderer.getSerializedState()
        );
        return {
          question,
          hints,
        };
      },
      restoreSerializedState(answerState) {
        this.itemRenderer.restoreSerializedState(answerState);
        this.itemRenderer.getWidgetIds().forEach(id => {
          if (sorterWidgetRegex.test(id)) {
            if (answerState.question[id]) {
              const sortableComponent = this.itemRenderer.questionRenderer.getWidgetInstance(id)
                .refs.sortable;
              const newProps = Object.assign({}, sortableComponent.props, {
                options: answerState.question[id].options,
              });
              sortableComponent.setState({ items: sortableComponent.itemsFromProps(newProps) });
            }
          }
        });
      },
      setAnswer() {
        this.blankState = this.getSerializedState();
        // If a passed in answerState is an object with the right keys, restore.
        if (
          this.itemRenderer &&
          this.answerState &&
          this.answerState.question &&
          this.answerState.hints &&
          !this.loading
        ) {
          this.restoreSerializedState(this.answerState);
        } else if (this.showCorrectAnswer && !this.loading) {
          this.setCorrectAnswer();
        } else if (this.itemRenderer && !this.loading) {
          // Not setting an answer state, but need to hide any hints.
          this.itemRenderer.setState({
            hintsVisible: 0,
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
        if (
          this.itemRenderer &&
          this.itemRenderer.state.hintsVisible < this.itemRenderer.getNumHints()
        ) {
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
          client(`${this.defaultFile.storage_url}${this.itemId}.json`)
            .then(itemResponse => {
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
            })
            .catch(reason => {
              logging.debug('There was an error loading the assessment item data: ', reason);
              this.clearItemRenderer();
              this.$emit('itemError', reason);
            });
        }
      },
      setCorrectAnswer() {
        const questionRenderer = this.itemRenderer.questionRenderer;
        const widgetProps = questionRenderer.state.widgetInfo;

        const gradedWidgetIds = questionRenderer.widgetIds.filter(id => {
          return widgetProps[id].graded == null || widgetProps[id].graded;
        });

        try {
          gradedWidgetIds.forEach(id => {
            const props = widgetProps[id];
            const widget = questionRenderer.getWidgetInstance(id);
            if (!widget) {
              // This can occur if the widget has not yet been rendered
              return;
            }
            widgetSolver(widget, props.type, props.options);
          });
        } catch (e) {
          this.$emit('answerUnavailable');
        }
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.theme'
  @import '../../../node_modules/perseus/stylesheets/local-only/khan-exercise.css'
  @import '../../../node_modules/perseus/lib/katex/katex.css'
  @import '../../../node_modules/perseus/build/perseus.css'
  @import '../../../node_modules/perseus/lib/mathquill/mathquill.css'

  #perseus
    border-radius: 8px
    padding: 16px
    background-color: $core-bg-light
    margin-top: 8px
    overflow-x: auto

  .bibliotron-exercise
    margin-bottom: 8px

  @font-face
    font-family: Symbola
    src: url(/static/fonts/Symbola.eot)
    src: local('Symbola Regular'),
  local('Symbola'),
  url(/static/fonts/Symbola.woff) format('woff'),
  url(/static/fonts/Symbola.ttf) format('truetype'),
  url(/static/fonts/Symbola.otf) format('opentype'),
  url(/static/fonts/Symbola.svg#Symbola) format('svg')

  .hint-btn-container
    margin-top: 32px
    text-align: right

  .hint-btn
    vertical-align: text-bottom

  .info-icon
    margin-left: 8px

  .loader-container
    width: 100%
    height: 4px

</style>


<style lang="stylus">

  // Reset global styles so that we don't interfere with perseus styling

  .perseus-root
    div, span, applet, object, iframe,
    h1, h2, h3, h4, h5, h6, p, blockquote, pre,
    a, abbr, acronym, address, big, cite, code,
    del, dfn, em, img, ins, kbd, q, s, samp,
    small, strike, strong, sub, sup, tt, var,
    b, u, i, center,
    dl, dt, dd, ol, ul, li,
    fieldset, form, label, legend,
    table, caption, tbody, tfoot, thead, tr, th, td,
    article, aside, canvas, details, embed,
    figure, figcaption, footer, header, hgroup,
    menu, nav, output, ruby, section, summary,
    time, mark, audio, video
      margin: 0
      padding: 0
      border: none
      vertical-align: baseline
    /* HTML5 display-role reset for older browsers */
    article, aside, details, figcaption, figure,
    footer, header, hgroup, menu, nav, section
      display: block

    ol, ul
      list-style: none

    blockquote, q
      quotes: none

    blockquote:before, blockquote:after,
    q:before, q:after
      content: ''
      content: none

    table
      border-collapse: collapse
      border-spacing: 0

  .keypad-container
    direction: ltr

</style>
