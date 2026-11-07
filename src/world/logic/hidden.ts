// The Unshipped Room: finding it is a secret.
import type { RoomLogic } from '../types';
import { game as G } from '../../core/state';

const logic: RoomLogic = {
  create() {
    G.secret('hidden');
  },
};
export default logic;
