import log from "loglevel";
import Context from "../context.js";
import DecompositionStatus from "../decompositionStatus.js";
import PrimitiveTask from "./primitiveTask.js";
import * as SelectorTask from "./selectorTask.js";
import * as SequenceTask from "./sequenceTask.js";

class CompoundTask {
  constructor({ name, tasks, type, conditions }) {
    this.Conditions = [];
    this.Children = [];

    this.Name = name;
    this.Type = type;

    if (Array.isArray(tasks)) {
      tasks.forEach((task) => {
        if (task instanceof PrimitiveTask || task instanceof CompoundTask) {
          this.Children.push(task);
        } else if (typeof (task) === "function" || task.operator) {
          this.Children.push(new PrimitiveTask(task));
        } else {
          this.Children.push(new CompoundTask(task));
        }
      });
    } else if (typeof (tasks) === "function") {
      this.Children.push(new PrimitiveTask(tasks));
    }

    this._validityTest = this.defaultValidityTest;

    // For simple HTNs, we make sequence and selector default node types and wire everything up
    if (type === "sequence") {
      this._validityTest = SequenceTask.isValid;
      this._decompose = SelectorTask.decompose;
    } else if (type === "select") {
      this._validityTest = SelectorTask.isValid;
      this._decompose = SelectorTask.decompose;
    }
    // TODO: This would be a point to allow for extensibility to allow folks to provide
    // their own 'isValid' function

    // Set the conditions array
    if (conditions instanceof Array) {
      this.Conditions = conditions;
    }
  }

  isValid(context) {
    return this._validityTest(context, this);
  }

  defaultValidityTest(context) {
    if (context === undefined || !(context instanceof Context) || context.Initialized === false) {
      return false;
    }

    // Evaluate every condition for this task
    // If any return false, the condition for this task is not valid
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

  _decompose() {
    log.warn(`Compound task of ${this.Type} type (no decompose method) was decomposed! Task: ${this.Name}`);

    return DecompositionStatus.Rejected;
  }

  decompose(context, startIndex, result) {
    return this._decompose(context, startIndex, result, this);
  }
}

export default CompoundTask;
