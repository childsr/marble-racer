import { createBoostGate } from "./BoostGate"
import { createCurvedRamp } from "./CurvedRamp"
import { createFinishZone } from "./FinishZone"
import { createMarble } from "./Marble"
import { createPin } from "./Pin"
import { createRamp } from "./Ramp"
import { createScatterGate } from "./ScatterGate"
import { createSpinner } from "./Spinner"
import { createBounceRamp } from "./BounceRamp"

const partCreators = {
  ramp: createRamp,
  curved_ramp: createCurvedRamp,
  pin: createPin,
  spinner: createSpinner,
  finish_zone: createFinishZone,
  marble: createMarble,
  scatter_gate: createScatterGate,
  boost_gate: createBoostGate,
  bounce_ramp: createBounceRamp,
};