<template>

  <div id="attempt-progress-container">
    <div id="attempts">
      <div id="attempt" v-for="attempt in recentAttempts">
        <div v-if="attempt.hinted"><svg id="lightbulb" src="./lightbulb_black.svg"></svg></div>
        <div v-if="!attempt.hinted && attempt.correct"><svg id="correct" src="./check_black.svg"></svg></div>
        <div v-if="!attempt.hinted && !attempt.correct"><svg id="incorrect" src="./clear_black.svg"></svg></div>
      </div>
    </div>

    <p id="message" v-if="passRatioN === passNum">{{ $tr("get") }} <b>{{passRatioM}} {{ $tr("outof") }} {{passRatioN}}</b> {{ $tr("correct") }}</p>
    <p id="message" v-if="passNum > 0 && passRatioN !== passNum">{{ $tr("get") }} <b>{{ passNum }}</b> {{ $tr("more") }}</p>
    <p id="message" v-if="passNum <= 0 && passRatioN !== passNum">{{ $tr("hooray") }}</p>
  </div>

</template>


<script>

  module.exports = {

    data: () => ({
      item: undefined,
    }),
    methods: {
      dummy() {
        console.log('this is  a dummy method.');
      },
    },
    props: {
      recentAttempts: {
        type: Array,
        default: function () {
          return [{ correct: 0 }]
        },
      },
      passNum: {
        type: Number,
      },
      passRatioM: {
        type: Number,
      },
      passRatioN: {
        type: Number,
      },
    },
    $trNameSpace: 'attemptprogress',
    $trs: {
      hooray: 'Hooray! Good job.',
      get: 'Get',
      outof: 'out of',
      correct: 'correct!',
      more: 'more correct!',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  #message
    color: grey
    position: relative
    text-align: center
    top: 6px
    clear: both
    @media screen and (max-width: $portrait-breakpoint)
      font-size: 12px
      margin-top: 0

  #attempts
    @media screen and (max-width: $portrait-breakpoint)
      position: relative
      left: 50%
      transform: translate(-50%, 0)
      display: inline-block
      top: 4px

  #attempt
    float: left;
    border-bottom: thin solid grey
    margin-left: 6px

  #lightbulb
    fill: grey

  #incorrect
    fill: grey

  #correct
    fill: $core-action-normal

  #attempt-progress-container
    @media screen and (max-width: $portrait-breakpoint)
      position: fixed
      background-color: $core-bg-light
      width: 100%
      bottom: $nav-portrait-height
      border-bottom: thin solid $core-text-annotation
      border-top: thin solid $core-text-annotation

</style>
