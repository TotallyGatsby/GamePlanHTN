// Portions of this file are derived from FluidHTN (MIT License)
// Copyright (c) 2019 Pål Trefall
// https://github.com/ptrefall/fluid-hierarchical-task-network

import log from "loglevel";
import Context from "../context.js";
import Effect from "../effect.js";

class PrimitiveTask {
  constructor(props) {
    this.Name = "";
    this.Conditions = [];
    this.Effects = [];

    // Process the operation, which can be either a raw function or an object containing an
    // operator field
    if (typeof (props) === "function") {
      this.operator = props;
    } else {
      // Complex objects have a number of things we need to pull from the object passed in
      this.Name = props.name;
      this.operator = props.operator;

      // Conditions are simple functions that return true/false depending on the world state
      if (Array.isArray(props.conditions)) {
        this.Conditions = props.conditions;
      }

      // Effects are more complex object than conditions, and can either be simple functions
      // or objects. The Effect class handles disambiguating this for us.
      if (Array.isArray(props.effects)) {
        props.effects?.forEach((effect) => {
          this.Effects.push(new Effect(effect));
        });
      }
    }

    this.ExecutingConditions = [];
  }

  toJSON() {
    // Clone the object to prevent modifying the original object
    const json = { ...this };

    // Replace the parent object with its name
    if (json.Parent) {
      json.Parent = json.Parent.Name;
    } else {
      json.Parent = null;
    }

    return json;
  }

  isValid(context) {
    if (context.LogDecomposition) {
      log.debug(`PrimitiveTask.IsValid check`);
    }

    // Check each of our conditions for validity. If any of them are false, this task cannot be
    // valid
    for (let index = 0; index < this.Conditions.length; index++) {
      if (typeof (this.Conditions[index]) !== "function") {
        return false;
      }

      if (this.Conditions[index](context) === false) {
        return false;
      }
    }

    return true;
  }

  applyEffects(context) {
    this.Effects.forEach((effect) => {
      effect.apply(context);
    });
  }

  addCondition(condition) {
    this.Conditions.push(condition);

    return this;
  }

  stop() {
    // TODO: Implement Stop on operators
  }
}

export default PrimitiveTask;
