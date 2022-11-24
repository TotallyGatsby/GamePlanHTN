import Context from "./context.js";
import CompoundTask from "./Tasks/compoundTask.js";
import PrimitiveTask from "./Tasks/primitiveTask.js";

class Domain {
  // TODO: Handle actions, conditions, and effects as separate objects (see domain test for example)
  constructor({ name, tasks, actions, conditions, effects }) {
    this.Name = name;
    this.Tasks = [];

    tasks.forEach((task) => {
      if (typeof (task) === "function" || task.operator) {
        this.Tasks.push(new PrimitiveTask(task));
      } else {
        this.Tasks.push(new CompoundTask(task));
      }
    });
  }

  findPlan(context) {
    if (!(context instanceof Context)) {
      throw new TypeError(`Domain received non-context object: ${JSON.stringify(context)}`);
    }

    if (!context.Initialized) {
      throw new Error("Context has not been initialized");
    }

    // The context is now in planning
    context.IsExecuting = false;


    // The context is no longer in planning
    context.IsExecuting = true;
    return true;
  }
}

export default Domain;
