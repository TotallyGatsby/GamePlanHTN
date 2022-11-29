import PrimitiveTask from "./Tasks/primitiveTask";
import TaskStatus from "./taskStatus";

class Planner {
  constructor() {
    this._currentTask = undefined;
    this._plan = [];
  }
  // Steps one 'frame' forward in planning.
  // eslint-disable-next-line max-statements, complexity -- Refactor this into smaller methods!
  tick(context, domain) {
    if (!context || !context.Initialized) {
      throw Error("Context not initialized prior to planning!");
    }

    // TODO: This should probably be an object with an 'error' property
    let decompositionStatus = "failure";
    let isReplacingAPlan = false;
    const newPlan = [];

    // If the context is dirty or we haven't started, start a new plan
    if (context.IsDirty || (this._currentTask === undefined && this._plan.length === 0)) {
      context.IsDirty = false;

      decompositionStatus = domain.findPlan(context);
      isReplacingAPlan = this._plan.length > 0;

      // TODO: Replace decompositionStatus with something more elegant
      if (decompositionStatus === "success") {
        if (isReplacingAPlan || this._currentTask) {
          // TODO: Invoke a callback for replacing a plan
        } else if (!isReplacingAPlan) {
          // TODO: Invoke a callback for creating a new plan
        }

        // Copy over the plan entries to the planner
        this._plan = [...newPlan];

        if (this._currentTask && this._currentTask instanceof PrimitiveTask) {
          // TODO: Invoke a callback for the current primitive task being stopped
          this._currentTask.stop(context);
          this._currentTask = undefined;
        }

        // Copy the current MTR into the Last MTR.
        context.LastMTR = [...context.MTR];
      }
    }

    // If we're replacing a plan and have no in flight tasks...
    if (this._currentTask && this._plan.length > 0) {
      // Set the current task to the head of the plan
      this._currentTask = this._plan.shift();

      if (this._currentTask) {
        // TODO: Callback for a new task starting

        // If the task is no longer valid, we need to replan
        if (!this._currentTask.isValid(context)) {
          // TODO: Callback for a new task condition failure

          // Clean up our plan
          this.cleanPlan(context);

          return;
        }
      }
    }

    if (this._currentTask) {
      if (this._currentTask instanceof PrimitiveTask) {
        if (this._currentTask.operator) {
          if (!this._currentTask.isValid(context)) {
            // TODO: for CurrentTaskExecutingConditionFailed

            // Clean up our plan
            this.cleanPlan(context);

            return;
          }

          const lastStatus = this._currentTask.operator(context);

          if (lastStatus === TaskStatus.Success) {
            // TODO: Callback for CurrentTaskCompletedSuccessfully

            // TODO: Apply all effects of the task


            // Clear our current task so we dequeue the next task on the next tick()
            this._currentTask = undefined;

            // If this was the last item in our plan, clean up
            if (this._plan.length === 0) {
              context.LastMTR = [];
              context.IsDirty = false;
              // TODO; This is where we could immediately replan if we wanted.
            }
          } else if (lastStatus === TaskStatus.Failure) {
            // If the task failed, we need to replan
            // TODO: Invoke Current Task Failed

            // Clean up our plan
            this.cleanPlan(context);
          } else {
            // Our current task is in progress, continue
            // TODO: invoke an onContinueTask item here
          }
        } else {
          // If we get here, there's a bug in the Domain or the library -- the planner should never
          // encounter a CompoundTask at this point
          throw new Error(`Invalid domain, received a compound task in planner: ${JSON.stringify(this._currentTask)}`);
        }
      }
    }

    // TODO: Fluid HTN has an additional fall through check here if things break catastrophically
  }

  cleanPlan(context) {
    // Clean up our plan
    this._currentTask = undefined;
    this._plan = [];
    context.LastMTR = [];
    context.IsDirty = false;
  }
}
export default Planner;
