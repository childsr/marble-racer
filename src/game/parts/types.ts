import Phaser from "phaser";

export interface Part {
  id: string;
  type: "ramp" | "pin" | "spinner" | "bin" | "finish_zone" | "marble" | "scatter_gate";
  graphic: any;
  body: MatterJS.BodyType;
  w: number;
  h: number;
  baseAngle: number;
  color: number;
  spinnerSpeed?: number;
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
}
