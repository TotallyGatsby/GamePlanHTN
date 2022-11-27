import Context from "./context.js";
import CompoundTask from "./Tasks/compoundTask.js";
import PrimitiveTask from "./Tasks/primitiveTask.js";
import DecompositionStatus from "./decompositionStatus.js";

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

    this.Root = new CompoundTask({ name: "Root", tasks, type: "selector" });
  }

  // eslint-disable-next-line max-statements -- Cleanup later
  findPlan(context, plan) {
    if (!(context instanceof Context)) {
      throw new TypeError(`Domain received non-context object: ${JSON.stringify(context)}`);
    }

    if (!context.Initialized) {
      throw new Error("Context has not been initialized");
    }

    // The context is now in planning
    context.IsExecuting = false;

    plan = [];
    let status = DecompositionStatus.Rejected;

    context.MTR = [];

    status = this.Root.decompose(context, 0, plan);

    // If this MTR equals the last MTR, then we need to double check whether we ended up
    // just finding the exact same plan. During decomposition each compound task can't check
    // for equality, only for less than, so this case needs to be treated after the fact.
    let isMTRsEqual = context.MTR.length === context.LastMTR.length;

    if (isMTRsEqual) {
      for (let i = 0; i < context.MTR.length; i++) {
        if (context.MTR[i] < context.LastMTR[i]) {
          isMTRsEqual = false;
          break;
        }
      }

      if (isMTRsEqual) {
        plan = [];
        status = DecompositionStatus.Rejected;
      }
    }

    if (status === DecompositionStatus.Succeeded) {
      // Trim away any plan-only or plan&execute effects from the world state change stack, that only
      // permanent effects on the world state remains now that the planning is done.
      context.trimForExecution();

      // Apply permanent world state changes to the actual world state used during plan execution.
      for (let i = 0; i < context.WorldStateChangeStack.length; i++) {
        const stack = context.WorldStateChangeStack[i];

        if (stack && stack.length > 0) {
          context.WorldState[i] = stack.pop();
        }
      }
    } else {
      // Clear away any changes that might have been applied to the stack
      // No changes should be made or tracked further when the plan failed.
      for (let i = 0; i < context.WorldStateChangeStack.length; i++) {
        const stack = context.WorldStateChangeStack[i];

        if (stack && stack.length > 0) {
          stack.clear();
        }
      }
    }

    // The context is no longer in planning
    context.IsExecuting = true;

    return true;
  }
}

export default Domain;
