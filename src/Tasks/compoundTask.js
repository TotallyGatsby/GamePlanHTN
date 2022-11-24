import Context from "../context.js";
import PrimitiveTask from "./primitiveTask.js";
import * as SelectorTask from "./selectorTask.js";
import * as SequenceTask from "./sequenceTask.js";

class CompoundTask {
  constructor({ name, tasks, type }) {
    this.Conditions = [];
    this.Children = [];

    this.Name = name;
    this.Type = type;

    if (Array.isArray(tasks)) {
      tasks.forEach((task) => {
        if (typeof (task) === "function" || task.operator) {
          this.Children.push(new PrimitiveTask(task));
        } else {
          this.Children.push(new CompoundTask(task));
        }
      });
    } else if (typeof (tasks) === "function") {
      this.Children.push(new PrimitiveTask(tasks));
    }

    this._validityTest = this.defaultValidityTest;

    if (type === "sequence") {
      this._validityTest = SequenceTask.isValid;
    } else if (type === "selector") {
      this._validityTest = SelectorTask.isValid;
    }
    // TODO: This would be a point to allow for extensibility to allow folks to provide
    // their own 'isValid' function
  }

  isValid(context) {
    this._validityTest(context, this);
  }

  defaultValidityTest(context) {
    if (context === undefined || !(context instanceof Context) || context.Initialized === false) {
      return false;
    }

    // Evaluate every condition for this task
    // If any return false, the condition for this task is not valid
    for (let index = 0; index < this.Conditions.length; index++) {
      if (typeof (this.Conditions[index]) === "function") {
        if (this.Conditions[index](context) === false) {
          return false;
        }
      }
    }

    return true;
  }
}

export default CompoundTask;
