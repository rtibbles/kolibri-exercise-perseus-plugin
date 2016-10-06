<template>

  <div id="exercise-container">
    <assessment-wrapper
      v-ref:wrapper
      v-if="exercise"
      :item-id="itemId"
      :mastery-model="exercise.mastery_model"
      :mastery-spacing-time="exercise.masterySpacingTime">
      <perseus v-if="item" :item="item"></perseus>
    </assessment-wrapper>
  </div>

</template>


<script>

  module.exports = {
    data: () => ({
      item: undefined,
      exercise: undefined,
      itemId: undefined,
    }),
    methods: {
      setItemId() {
        const items = this.exercise.all_assessment_items;
        const attempts = this.$refs.totalattempts || 0;
        this.itemId = items[attempts % items.length];
        this.$emit('itemIdSet');
      },
      setItemData() {
        this.Kolibri.client(
          `${this.defaultFile.storage_url}${this.itemId}.json`
          ).then((itemResponse) => {
            this.item = itemResponse.entity;
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
          this.setItemId();
          this.setItemData();
          this.$emit('assessmentDataLoaded');
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
    border: double 3px grey
    height: 100%
    overflow: auto

</style>

