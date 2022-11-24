import CompoundTask from "./Tasks/compoundTask.js";
import PrimitiveTask from "./Tasks/primitiveTask.js";

class Domain {
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

  findPlan() {
    return true;
  }
}

export default Domain;
