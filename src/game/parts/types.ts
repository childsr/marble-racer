import Phaser from "phaser";

export type PartType =
  | "ramp"
  | "curved_ramp"
  | "pin"
  | "spinner"
  | "finish_zone"
  | "marble"
  | "scatter_gate"
  | "boost_gate"
  | "bounce_ramp"
//
export interface Part {
  id: string;
  type: PartType
  graphic: any;
  body: MatterJS.BodyType;
  w: number;
  h: number;
  baseAngle: number;
  color: number;
  spinnerSpeed?: number;
  boostAmount?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  cx?: number;
  cy?: number;
  segments?: number;
}

export interface SerializedPart {
  id: string;
  type: Part["type"];
  x: number;
  y: number;
  w: number;
  h: number;
  baseAngle: number;
  color: number;
  spinnerSpeed?: number;
  boostAmount?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  cx?: number;
  cy?: number;
  segments?: number;
}

// IGNORE FOR NOW
export interface PartConfig<Params> {
  createBody: (params: Params) => MatterJS.Body
}