import PrimitiveTask from "./primitiveTask.js";

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
  }

  isValid(context) {
    if (context === undefined) {
      return false;
    }

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
