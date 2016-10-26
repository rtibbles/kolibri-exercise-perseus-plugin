<template>

  <div id="exercise-container">
    <assessment-wrapper
      id = "assessment-container"
      v-ref:wrapper
      v-if="exercise"
      :item-id="itemId"
      :mastery-model="exercise.mastery_model"
      :mastery-spacing-time="exercise.masterySpacingTime"
      :mastery-criterion="exercise.masteryCriterion"
    >
      <perseus
        v-if="item"
        :item="item"
        :pass-ratio-m="passRatioM"
        :pass-ratio-n="passRatioN"
        @nextquestion="nextQuestion"
        @nextcontent="nextContent"
      ></perseus>
    </assessment-wrapper>
  </div>

</template>


<script>

  const ss = require('seededshuffle');
  const UserKinds = require('kolibri.coreVue.vuex.constants').UserKinds;

  module.exports = {

    data: () => ({
      item: undefined,
      items: undefined,
      exercise: undefined,
      itemId: undefined,
      // how many most recent questions taken into account?
      passRatioM: 5,
      // how many questions need to get right?
      passRatioN: 4,
    }),
    methods: {
      nextQuestion() {
        this.setItemData();
      },
      nextContent() {
        console.log('*** nextContent ***');
      },
      loadItemData(attempts) {
        const itemIndex = attempts % this.items.length;
        this.itemId = this.items[itemIndex];
        this.Kolibri.client(
          `${this.defaultFile.storage_url}${this.itemId}.json`
          ).then((itemResponse) => {
            this.item = itemResponse.entity;
          }).catch(function(reason) {
            console.log('Oops, you got rejected: ', reason);
          });
      },
      setItemData() {
        // this.passRatioM = this.exercise.passRatioM;
        // this.passRatioN = this.exercise.passRatioN;
        if (this.userkind.includes(UserKinds.LEARNER)) {
          if(!this.totalattempts) {
            let watchRevoke;
            watchRevoke = this.$watch('totalattempts', () => {
              this.loadItemData(this.totalattempts);
              watchRevoke();
            }, {deep:true});
          } else {
            this.loadItemData(this.totalattempts);
          }
        } else {
          /*
          Require further work here.
          Now for anonymous users they will always see the first question.
          */
          this.loadItemData(0);
        }
      }
    },
    components: {
      perseus: require('./perseus'),
      assessmentWrapper: require('kolibri.core.assets.src.vue.assessment-wrapper'),
    },
    created() {
      this.Kolibri.client(`${this.defaultFile.storage_url}exercise.json`).then(
        (exerciseResponse) => {
          this.exercise = exerciseResponse.entity;
          this.exercise.masteryCriterion = "to be deleted";
          if (this.userid) {
            this.items = ss.shuffle(exerciseResponse.entity.all_assessment_items, this.userid, true);
          } else {
            this.items = exerciseResponse.entity.all_assessment_items;
          }
          this.setItemData();
        }).catch(function(reason) {
          console.log('Oops, requesting exercise.json got rejected: ', reason);
        });
    },
    props: [
      'defaultFile',
    ],
    vuex: {
      getters: {
        totalattempts: (state) => state.core.logging.mastery.totalattempts,
        userid: (state) => state.core.session.user_id,
        userkind: (state) => state.core.session.kind,
      },
    },
  };

</script>

<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

</style>

