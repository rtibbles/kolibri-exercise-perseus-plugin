<template>

  <div id="exercise-container">
    <assessment-wrapper
      id = "assessment-container"
      v-ref:wrapper
      v-if="exercise"
      :item-id="itemId"
      :assessment-data-loaded="assessmentDataLoaded"
      :mastery-model="exercise.mastery_model"
      :mastery-spacing-time="exercise.masterySpacingTime">
      <perseus v-if="item" :item="item" v-on:nextquestion="nextQuestion"></perseus>
    </assessment-wrapper>
  </div>

</template>


<script>

  module.exports = {

    data: () => ({
      item: undefined,
      exercise: undefined,
      itemId: undefined,
      assessmentDataLoaded: false,
    }),
    methods: {
      nextQuestion() {
        const items = this.exercise.all_assessment_items;
        // still need to decide how we want to cycle through the questions
        this.setItemData();
      },
      setItemData() {
        const items = this.exercise.all_assessment_items;
        const attempts = this.$refs.totalattempts || 0;
        this.itemId = items[attempts % items.length];
        this.Kolibri.client(
          `${this.defaultFile.storage_url}${this.itemId}.json`
          ).then((itemResponse) => {
            this.item = itemResponse.entity;
            this.assessmentDataLoaded = true;
          }).catch(function(reason) {
            console.log('Oops, you got rejected: ', reason);
          });
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
          this.setItemData();
        }).catch(function(reason) {
          console.log('Oops, requesting exercise.json got rejected: ', reason);
        });;
    },
    props: [
      'defaultFile',
    ],
  };

</script>

<style lang="stylus" scoped>

  @require '~kolibri/styles/coreTheme'

  #exercise-container
    height: 120%
    position: relative
    padding-top: 8px

  #assessment-container
    position: relative
    height: 100%

</style>

