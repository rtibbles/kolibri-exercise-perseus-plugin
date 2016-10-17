<template>

  <div id="exercise-container">
    <assessment-wrapper
      id = "assessment-container"
      v-ref:wrapper
      v-if="exercise"
      :item-id="itemId"
      :mastery-model="exercise.mastery_model"
      :mastery-spacing-time="exercise.masterySpacingTime">
      <perseus v-if="item" :item="item" :pass-ratio-m="passRatioM" :pass-ratio-n="passRatioN" v-on:nextquestion="nextQuestion" v-on:nextcontent="nextContent"></perseus>
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
      loadItemData() {
        const attempts = this.pastattempts.length;
        // const itemIndex = attempts % this.items.length;
        const itemIndex = 1;
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
        if(!this.pastattempts) {
          let watchRevoke;
          watchRevoke = this.$watch('pastattempts', () => {
            this.loadItemData();
            watchRevoke();
          }, {deep:true});
        } else {
          this.loadItemData();
        }
      }
    },
    components: {
      perseus: require('./perseus'),
      assessmentWrapper: require('kolibri/core/assets/src/vue/assessment-wrapper'),
    },
    created() {
      this.Kolibri.client(`${this.defaultFile.storage_url}exercise.json`).then(
        (exerciseResponse) => {
          this.exercise = exerciseResponse.entity;
          this.items = ss.shuffle(exerciseResponse.entity.all_assessment_items, this.userid, true);
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
        pastattempts: (state) => state.core.logging.mastery.pastattempts,
        userid: (state) => state.core.session.user_id,
      },
    },
  };

</script>

<style lang="stylus" scoped>

  @require '~kolibri/styles/coreTheme'

  // #exercise-container
  //   height: 120%
  //   position: relative
  //   padding-top: 8px

  // #assessment-container
  //   position: relative
  //   height: 100%

</style>

