/**
 * Gwanghwamun Square's one tuning block: how big its monuments stand and where, and the fountain's field
 * and jets. Read by skyline.js (the statues, where the fountain goes), plaza.js (the plinths as solids, the
 * racing lane up the walkway, people among the jets) and fountain.js (its layout, its jets' heights).
 *
 * As the 2022 square has it: all of it west of Sejong-daero (the traffic all on the east), the admiral near
 * its south end on its east side, the floor fountain north of him between him and King Sejong, the gardens
 * on its west. World metres from City Hall (x east, z south).
 */
export const SQUARE = {
  // Larger than life for the game, so a rider sees them from down the square: 1 = true size — the admiral
  // 17 m (the statue 6.5 m on a 10.5 m plinth), King Sejong 10.4 m with his pedestal. Both monuments with
  // their plinths, the turtle ship and the inscription are scaled; so are their solids (plaza.js).
  scale: 2.5,
  admiral: { x: -98, z: -512, height: 17 },
  sejong: { x: -93, z: -695, height: 10.4 },
  fountain: {
    // the central walkway's middle line (the racing lane runs up it) and the field's south and north ends
    x: -103,
    z0: -575,
    z1: -655,
    // the walkway between the two fields (the tall rows stand along its edges)
    walk: 16,
    // each field: columns across and their spacing, rows down its length every `dz` metres
    cols: 9,
    dx: 1.8,
    dz: 2.4,
    // a tall jet every `tallEvery` metres along both edges of the walkway and both outer edges
    tallEvery: 4.8,
    // the jets' tops (m): the field's, the tall rows', the centre burst's
    field: 6,
    tall: 16,
    burst: 20,
    // drawn in full within `near` metres of the camera; past it every other row and column (and the tall rows)
    near: 260
  }
};
