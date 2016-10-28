<template>

  <div id="exercise-container">
    <assessment-wrapper
      id = "assessment-container"
      v-ref:wrapper
      v-if="exercise"
      :item-id="itemId"
      :mastery-spacing-time="exercise.masterySpacingTime"
      :mastery-criterion="exercise.mastery_model"
    >
      <perseus
        v-if="item"
        :item="item"
        :pass-ratio-m="passRatioM"
        :pass-ratio-n="passRatioN"
        @nextquestion="nextQuestion"
      ></perseus>
    </assessment-wrapper>
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
    }),
    methods: {
      nextQuestion() {
        this.setItemData();
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
        this.passRatioM = this.exercise.m;
        this.passRatioN = this.exercise.n;
        if(!this.totalattempts && this.totalattempts !== 0) {
          let watchRevoke;
          watchRevoke = this.$watch('totalattempts', () => {
            this.loadItemData(this.totalattempts);
            watchRevoke();
          }, {deep:true});
        } else {
          this.loadItemData(this.totalattempts);
        }
      }
    },
    components: {
      perseus: require('./perseus'),
    },
    created() {
      this.Kolibri.client(`${this.defaultFile.storage_url}exercise.json`).then(
        (exerciseResponse) => {
          this.exercise = exerciseResponse.entity;
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
      },
    },
  };

</script>

<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

</style>

