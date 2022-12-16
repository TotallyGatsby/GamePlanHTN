// Portions of this file are derived from FluidHTN (MIT License)
// Copyright (c) 2019 Pål Trefall
// https://github.com/ptrefall/fluid-hierarchical-task-network

import EffectType from "./effectType.js";

class Effect {
  constructor(props) {
    if (typeof (props) === "function") {
      this._effectFunction = props;
      this.Type = null;
      this.Name = "Unnamed Effect";
    } else {
      this._effectFunction = props.action;
      this.Type = props.type;
      this.Name = props.name;
    }
  }

  apply(context) {
    if (typeof (this._effectFunction) === "function") {
      this._effectFunction(context, this.Type);
    }
  }
}

export default Effect;
