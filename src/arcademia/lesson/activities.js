/**
 * How each activity kind plays inside a lesson (content/schema.js ACTIVITIES says what data each
 * needs and which quest steps it shows). The lesson runner (LessonRunner.js) walks a lesson's
 * activities in order and awaits RUNNERS[kind](runner) for each; it never names a kind itself.
 *
 * A runner gets the Runner: `runner.lesson` (in the player's language), `runner.room` (the 3D room:
 * classroom, hall or lab, world/interiors.js), `runner.main` (the card area), `runner.at` (the index
 * of this activity's first quest step; call runner.steps(runner.quest.steps, runner.at + 1) to move
 * to its second), and the helpers: clear(), shot(name), say(text, { line }), speak(lineId),
 * until(...buttons), choices(q, fb, done), good / oops, teacherReact, buddy, game (sound, prefs).
 * It resolves when the child is done with the activity; leaving the lesson rejects runner.until.
 *
 * To add a kind: write its runner (here, or in its own file imported here) and add it to RUNNERS,
 * plus its entry in content/schema.js ACTIVITIES (docs/arcademia.md, "Adding an activity kind").
 */
export const RUNNERS = {
  story: (r) => r.story(),
  learn: (r) => r.reading(),
  board: (r) => r.boardStep(),
  try: (r) => r.practiceStep(),
  chat: (r) => r.chatStep(),
  timeline: (r) => r.timelineStep(),
  treasure: (r) => r.artifactStep(),
  experiment: (r) => r.simStep(),
  challenge: (r) => r.challenge()
};
