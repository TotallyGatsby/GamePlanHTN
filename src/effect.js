// Portions of this file are derived from FluidHTN (MIT License)
// Copyright (c) 2019 Pål Trefall
// https://github.com/ptrefall/fluid-hierarchical-task-network

class Effect {
  constructor(props) {
    // TODO: Handle more complex Effects, e.g. planning only Effects
    if (typeof (props) === "function") {
      this._effectFunction = props;
    }
  }

  apply(context) {
    if (typeof (this._effectFunction) === "function") {
      this._effectFunction(context);
    }
  }
}

export default Effect;
