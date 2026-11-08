// Where each room sits on the MAP, in map cells (x, y, w, h; y grows downwards).
// Rooms that share a door touch along the wall that door is on, so the map reads like real geography:
//
//                         exit
//                        summit
//                        garden
//                       records hidden
//               shop    library
//   hallway  house     town      lab    ruins3
//                 memorial  crossroads  ruins1  ruins2
//                            hall
//                            start
export const WORLD_MAP: Record<string, [number, number, number, number]> = {
  exit: [12.75, -1.5, 2.5, 2],
  summit: [12.75, 0.5, 2.5, 2],
  garden: [12.5, 2.5, 3, 2.5],
  records: [12.75, 5, 2.5, 2.5],
  hidden: [15.25, 5.5, 1.5, 2],
  library: [12, 7.5, 4, 2.5],
  shop: [9.5, 8, 2.5, 2],
  town: [9.5, 10, 5.5, 4],
  hallway: [2.5, 12.5, 3.5, 1.1],
  house: [6, 11.75, 3.5, 2.25],
  lab: [15, 11.75, 4.1, 2.5],
  ruins3: [19.1, 11.75, 4, 3],
  crossroads: [10, 14, 4, 3],
  memorial: [7, 14.75, 3, 2],
  ruins1: [14, 14.75, 4, 1.75],
  ruins2: [18, 14.75, 4, 1.75],
  hall: [11, 17, 2, 3],
  start: [10.5, 20, 3, 2.25],
};

/** The room with the boss gets a skull on the map. */
export const BOSS_ROOM = 'summit';
