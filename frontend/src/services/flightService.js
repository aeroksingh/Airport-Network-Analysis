// flightService.js — thin wrapper kept for useFlightSocket compatibility
import { flightAPI } from './api';
export default { getAll: p => flightAPI.getAll(p) };
