// Portions of this file are derived from FluidHTN (MIT License)
// Copyright (c) 2019 Pål Trefall
// https://github.com/ptrefall/fluid-hierarchical-task-network

import log from "loglevel";
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
      this._decompose = SequenceTask.decompose;
    } else if (type === "select") {
      this._validityTest = SelectorTask.isValid;
      this._decompose = SelectorTask.decompose;
    }
    // TODO: This would be a point to allow for extensibility to allow folks to provide
    // their own 'isValid' function

    // Set the conditions array
    if (Array.isArray(conditions)) {
      this.Conditions = conditions;
    }
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
    return this._validityTest(context, this);
  }

  defaultValidityTest(context) {
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

  decompose(context, startIndex) {
    return this._decompose(context, startIndex, this);
  }

  addSubtask(subtask) {
    this.Children.push(subtask);

    return this;
  }

  addCondition(condition) {
    this.Conditions.push(condition);

    return this;
  }
}

export default CompoundTask;
