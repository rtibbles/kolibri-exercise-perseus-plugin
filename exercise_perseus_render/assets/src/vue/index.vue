<template>

  <div id="exercise-container">
    <assessment-wrapper
      id = "assessment-container"
      v-ref:wrapper
      v-if="exercise"
      :item-id="itemId"
      :mastery-spacing-time="exercise.masterySpacingTime"
      :mastery-criterion="exercise.mastery_model"
      @nextquestion="nextQuestion"
    >
      <perseus
        :item="item"
        :pass-ratio-m="passRatioM"
        :pass-ratio-n="passRatioN"
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
        :numspaces="passRatioN"
        :log="recentAttempts"
      >
      </exercise-attempts>
      <p class="message">Get <b>{{passRatioM}}</b> check marks showing up!</p>
    </div>
  </div>

</template>


<script>

  const ss = require('seededshuffle');

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
          return undefined;
        }
        if (this.pastattempts.length > this.passRatioN) {
          return this.pastattempts.slice(0, this.passRatioN);
        }
        return this.pastattempts;
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
            console.log('Oops, you got rejected: ', reason);
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
          console.log('Oops, requesting exercise.json got rejected: ', reason);
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
    position: relative
    text-align: center
    clear: both
    top: 40px
    @media screen and (max-width: $portrait-breakpoint)
      font-size: 12px
      margin-top: 0

  .attemptprogress
    position: absolute
    left: 50%
    transform: translate(-50%, 0)

  #attemptprogress-container
    position: relative
    bottom: 60px
    @media screen and (max-width: $portrait-breakpoint)
      position: fixed
      background-color: $core-bg-light
      width: 100%
      height: 60px
      bottom: $nav-portrait-height
      border-bottom: thin solid $core-text-annotation
      border-top: thin solid $core-text-annotation
      z-index: 1
      left: 0

</style>

