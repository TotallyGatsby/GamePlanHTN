import Context from "../context.js";

class PrimitiveTask {
  constructor(props) {
    this.Name = "";
    this.Conditions = [];
    this.Effects = [];

    if (typeof (props) === "function") {
      this.Operator = props;
    } else {
      this.Name = props.name;
      this.Operator = props.operator;
      if (props.conditions instanceof Array) {
        this.Conditions = props.conditions;
      }
    }
  }

  isValid(context) {
    if (context === undefined || !(context instanceof Context) || context.Initialized === false) {
      console.warn("Context is not initialized for primitive task!");

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
}

export default PrimitiveTask;
