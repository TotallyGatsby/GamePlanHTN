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
      if (props.conditions instanceof Array) {
        this.Conditions = props.conditions;
      }

      // Effects are more complex object than conditions, and can either be simple functions
      // or objects. The Effect class handles disambiguating this for us.
      if (props.effects instanceof Array) {
        props.effects?.forEach((effect) => {
          this.Effects.push(new Effect(effect));
        });
      }
    }
  }

  isValid(context) {
    if (context === undefined || !(context instanceof Context) || context.Initialized === false) {
      log.warn("Context is not initialized for primitive task!");

      return false;
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

  stop() {
    // TODO: Do something on stop?
  }
}

export default PrimitiveTask;
