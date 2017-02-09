<template>

  <div id="exercise-container">
    <assessment-wrapper
      id = "assessment-container"
      ref:wrapper
      v-if="exercise"
      :itemId="itemId"
      :masterySpacingTime="exercise.masterySpacingTime"
      :masteryCriterion="exercise.mastery_model"
      @nextquestion="nextQuestion"
    >
      <perseus
        v-if="item"
        :item="item"
        :passRatioM="passRatioM"
        :passRatioN="passRatioN"
        @hinttaken="hintTaken"
        @answerchecked="answerChecked"
        @exercisepassed="exercisePassed"
      ></perseus>
    </assessment-wrapper>
    <div id="attemptprogress-container">
      <exercise-attempts
        class="attemptprogress"
        :waiting="waiting"
        :success="success"
        :numSpaces="passRatioN"
        :log="recentAttempts"
      />
      <p class="message">GOAL: Get <b>{{passRatioM}}</b> check marks showing up!</p>
    </div>
  </div>

</template>


<script>

  const ss = require('seededshuffle');
  const logging = require('kolibri.lib.logging').getLogger(__filename);

  module.exports = {

    data: () => ({
      item: undefined,
      items: undefined,
      exercise: undefined,
      itemId: undefined,
      // how many questions need to get right?
      passRatioM: 4,
      // how many most recent questions taken into account?
      passRatioN: 5,
      waiting: true,
      success: false,
    }),

    computed: {
      recentAttempts() {
        if (!this.pastattempts) {
          return [];
        }
        // map the list of attempt objects to simple strings
        // ordered from first to last
        return this.pastattempts.map(attempt => {
          if (attempt.hinted) {
            return 'hint';
          }
          return attempt.correct ? 'right' : 'wrong';
        }).reverse();
      },
    },

    methods: {
      answerChecked() {
        this.waiting = false;
      },
      hintTaken() {
        this.waiting = false;
      },
      nextQuestion() {
        this.waiting = true;
        this.setItemData();
      },
      exercisePassed() {
        this.success = true;
      },
      loadItemData(attempts) {
        const itemIndex = attempts % this.items.length;
        this.itemId = this.items[itemIndex];
        this.Kolibri.client(
          `${this.defaultFile.storage_url}${this.itemId}.json`
          ).then((itemResponse) => {
            this.item = itemResponse.entity;
          }).catch(reason => {
            logging.debug(`Oops, you got rejected: ${reason}`);
          });
      },
      setItemData() {
        this.passRatioM = this.exercise.m;
        this.passRatioN = this.exercise.n;
        if (!this.totalattempts && this.totalattempts !== 0) {
          const watchRevoke = this.$watch(
            'totalattempts',
            () => {
              this.loadItemData(this.totalattempts);
              watchRevoke();
            }
          );
        } else {
          this.loadItemData(this.totalattempts);
        }
      },
    },
    components: {
      perseus: require('./perseus'),
      'assessment-wrapper': require('kolibri.coreVue.components.assessmentWrapper'),
      'exercise-attempts': require('kolibri.coreVue.components.exerciseAttempts'),
    },
    created() {
      this.Kolibri.client(`${this.defaultFile.storage_url}exercise.json`).then(
        (exerciseResponse) => {
          this.exercise = exerciseResponse.entity;
          if (this.userid) {
            this.items = ss.shuffle(this.exercise.all_assessment_items, this.userid, true);
          } else {
            this.items = this.exercise.all_assessment_items;
          }
          this.setItemData();
        }).catch(reason => {
          logging.debug(`Oops, requesting exercise.json got rejected: ${reason}`);
        });
    },
    props: [
      'defaultFile',
    ],
    vuex: {
      getters: {
        totalattempts: (state) => state.core.logging.mastery.totalattempts,
        pastattempts: (state) => state.core.logging.mastery.pastattempts,
        userid: (state) => state.core.session.user_id,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .message
    color: grey
    padding: 16px
    font-size: 14px
    @media screen and (max-width: $portrait-breakpoint)
      position: relative
      text-align: center
      clear: both
      top: 40px
      font-size: 12px
      margin-top: 0
      padding: 0

  .attemptprogress
    position: absolute
    padding-left: 14px
    top: 38px
    @media screen and (max-width: $portrait-breakpoint)
      top: 0
      padding-left: 0
      left: 50%
      transform: translate(-50%, 0)

  #attemptprogress-container
    border-radius: $radius
    position: relative
    background-color: $core-bg-light
    height: 84px
    bottom: 74px
    @media screen and (max-width: $portrait-breakpoint)
      position: fixed
      height: 60px
      width: 100%
      border-radius: 0
      bottom: $nav-portrait-height
      border-bottom: thin solid $core-text-annotation
      border-top: thin solid $core-text-annotation
      z-index: 10
      left: 0

</style>

