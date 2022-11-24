/* eslint-disable padding-line-between-statements */
/* eslint-disable no-console */
import CompoundTask from "./Tasks/compoundTask.js";

const TaskStatus = {
  Success: "success",
  Continue: "continue",
  Failure: "failure",
};

let example2 = {
  name: "Get A, B, then C",
  tasks: {
    GetC: {
      select: [
        {
          conditions: ["hasAandB", "hasNotC"],
          actions: ["getC"],
          effects: ["hasC"],
        },
      ],
    },
    GetAandB: {
      sequence: [
        {
          conditions: ["hasNotANorB"],
          actions: ["getA"],
          effects: ["hasA"],
        }, {
          actions: ["getA"],
          effects: ["hasB"],
        },
      ],
    },
    Done: {
      select: [
        {
          name: "Done",
          actions: ["done"],
        },
      ],
    },
  },
  actions: {
    done: (context) => {
      console.log("Done");
      context.setDone();

      return TaskStatus.Continue;
    },
    // Get A
    getA: () => {
      console.log("Get A");
      return TaskStatus.Success;
    },
    // Get B
    getB:
      () => {
        console.log("Get B");
        return TaskStatus.Success;
      },
    // Get C
    getC:
      () => {
        console.log("Get C");
        return TaskStatus.Success;
      },
  },
  conditions: {
    // Has NOT A NOR B
    hasNotANorB: (context) => !(context.hasState("HasA") && context.hasState("HasB")),
    // Has A and B
    hasAandB: (context) => context.hasState("HasA") && context.hasState("HasB"),
    // Has NOT C
    hasNotC: (context) => !context.hasState("HasC"),
  },
  effects: {
    hasA: (context) => context.setState("HasA"),
    hasB: (context) => context.setState("HasB"),
    hasC: (context) => context.setState("HasC"),
  },
};

class Domain {
  constructor({ name, tasks, actions, conditions, effects }) {
    this._tasks = [];

    tasks.forEach((task) => {
      this._tasks.push(new CompoundTask(task));
    });
  }

  findPlan() {
    return true;
  }
}

export default Domain;
