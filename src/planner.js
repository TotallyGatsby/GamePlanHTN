// Portions of this file are derived from FluidHTN (MIT License)
// Copyright (c) 2019 Pål Trefall
// https://github.com/ptrefall/fluid-hierarchical-task-network

import PrimitiveTask from "./Tasks/primitiveTask.js";
import TaskStatus from "./taskStatus.js";
import DecompositionStatus from "./decompositionStatus.js";
import EffectType from "./effectType.js";

class Planner {
  constructor() {
    this._currentTask = null;
    this._plan = [];
  }

  // ========================================================= PROPERTIES

  get LastStatus() {
    return this._lastStatus;
  }

  set LastStatus(status) {
    this._lastStatus = status;
  }

  // ========================================================= CALLBACKS

  get onNewPlan() {
    return this._onNewPlan;
  }

  set onNewPlan(callback) {
    this._onNewPlan = callback;
  }

  get onReplacePlan() {
    return this._onReplacePlan;
  }

  set onReplacePlan(callback) {
    this._onReplacePlan = callback;
  }

  get onNewTask() {
    return this._onNewTask;
  }

  set onNewTask(callback) {
    this._onNewTask = callback;
  }

  get onNewTaskConditionFailed() {
    return this._onNewTaskConditionFailed;
  }

  set onNewTaskConditionFailed(callback) {
    this._onNewTaskConditionFailed = callback;
  }

  get onStopCurrentTask() {
    return this._onStopCurrentTask;
  }

  set onStopCurrentTask(callback) {
    this._onStopCurrentTask = callback;
  }

  get onCurrentTaskCompletedSuccessfully() {
    return this._onCurrentTaskCompletedSuccessfully;
  }

  set onCurrentTaskCompletedSuccessfully(callback) {
    this._onCurrentTaskCompletedSuccessfully = callback;
  }

  get onApplyEffect() {
    return this._onApplyEffect;
  }

  set onApplyEffect(callback) {
    this._onApplyEffect = callback;
  }

  get onCurrentTaskFailed() {
    return this._onCurrentTaskFailed;
  }

  set onCurrentTaskFailed(callback) {
    this._onCurrentTaskFailed = callback;
  }

  get onCurrentTaskContinues() {
    return this._onCurrentTaskContinues;
  }

  set onCurrentTaskContinues(callback) {
    this._onCurrentTaskContinues = callback;
  }

  get onCurrentTaskExecutingConditionFailed() {
    return this._onCurrentTaskExecutingConditionFailed;
  }

  set onCurrentTaskExecutingConditionFailed(callback) {
    this._onCurrentTaskExecutingConditionFailed = callback;
  }

  // eslint-disable-next-line max-statements, complexity -- This is how it is in FluidHTN
  tick(domain, ctx, allowImmediateReplan = true) {
    if (!ctx.IsInitialized) {
      throw new Error("Context was not initialized!");
    }

    let decompositionStatus = DecompositionStatus.Failed;
    let isTryingToReplacePlan = false;

    // Check whether state has changed or the current plan has finished running.
    // and if so, try to find a new plan.
    if ((this._currentTask === null && this._plan.length === 0) || ctx.IsDirty) {
      let lastPartialPlanQueue = null;

      const worldStateDirtyReplan = ctx.IsDirty;

      ctx.IsDirty = false;

      if (worldStateDirtyReplan && ctx.HasPausedPartialPlan) {
        // If we're simply re-evaluating whether to replace the current plan because
        // some world state got dirt, then we do not intend to continue a partial plan
        // right now, but rather see whether the world state changed to a degree where
        // we should pursue a better plan. Thus, if this replan fails to find a better
        // plan, we have to add back the partial plan temps cached above.

        ctx.HasPausedPartialPlan = false;
        // NOTE: Deviates from FluidHTN, JS uses arrays for queues
        lastPartialPlanQueue = [];
        while (ctx.PartialPlanQueue.length > 0) {
          lastPartialPlanQueue.push(ctx.PartialPlanQueue.shift());
        }

        // We also need to ensure that the last mtr is up to date with the on-going MTR of the partial plan,
        // so that any new potential plan that is decomposing from the domain root has to beat the currently
        // running partial plan.
        ctx.shiftMTR();

        if (ctx.DebugMTR) {
          ctx.shiftMTRDebug();
        }
      }

      const result = domain.findPlan(ctx);

      decompositionStatus = result.status;
      const newPlan = result.plan;

      isTryingToReplacePlan = this._plan.length > 0;
      if (decompositionStatus === DecompositionStatus.Succeeded || decompositionStatus === DecompositionStatus.Partial) {
        if (this.onReplacePlan && (this._plan.length > 0 || this._currentTask)) {
          this.onReplacePlan(this._plan, this._currentTask, newPlan);
        } else if (this.onNewPlan && this._plan.length === 0) {
          this.onNewPlan(newPlan);
        }
        this._plan = [];

        this._plan.push(...newPlan);

        if (this._currentTask !== null && this._currentTask instanceof PrimitiveTask) {
          if (this.onStopCurrentTask) {
            this.onStopCurrentTask(this._currentTask);
          }
          this._currentTask.stop(ctx);
          this._currentTask = null;
        }

        // Copy the MTR into our LastMTR to represent the current plan's decomposition record
        // that must be beat to replace the plan.
        if (ctx.MethodTraversalRecord !== null) {
          ctx.shiftMTR();

          if (ctx.DebugMTR) {
            ctx.shiftMTRDebug();
          }
        }
      } else if (lastPartialPlanQueue !== null) {
        ctx.HasPausedPartialPlan = true;

        ctx.clearPartialPlanQueue();
        while (lastPartialPlanQueue.length > 0) {
          ctx.partialPlanQueue.push(lastPartialPlanQueue.shift());
        }

        if (ctx.LastMTR.length > 0) {
          ctx.restoreMTR();

          if (ctx.DebugMTR) {
            ctx.restoreMTRDebug();
          }
        }
      }
    }

    if (this._currentTask === null && this._plan.length > 0) {
      this._currentTask = this._plan.shift();
      if (this._currentTask) {
        if (this.onNewTask) {
          this.onNewTask(this._currentTask);
        }

        // TODO: Double check that we're defining rich enough Conditions so that when we pass them through they are
        // useful to our onNewTaskConditionFailed event
        for (let i = 0; i < this._currentTask.Conditions.length; i++) {
          // If a condition failed, then the plan failed to progress! A replan is required.
          if (this._currentTask.Conditions[i](ctx) === false) {
            if (this.onNewTaskConditionFailed) {
              this.onNewTaskConditionFailed(this._currentTask, this._currentTask.Conditions[i]);
            }
            this._currentTask = null;
            this._plan = [];
            ctx.clearLastMTR();
            if (ctx.DebugMTR) {
              ctx.clearLastMTRDebug();
            }
            ctx.HasPausedPartialPlan = false;
            ctx.clearPartialPlanQueue();
            ctx.IsDirty = false;

            return;
          }
        }
      }
    }

    if (this._currentTask) {
      if (this._currentTask instanceof PrimitiveTask) {
        if (this._currentTask.operator) {
          this._currentTask.ExecutingConditions.forEach((condition) => {
            // If a condition failed, then the plan failed to progress! A replan is required.
            if (!condition.func(ctx)) {
              if (this.onCurrentTaskExecutingConditionFailed) {
                this.onCurrentTaskExecutingConditionFailed(this._currentTask, condition);
              }

              this._currentTask = null;
              this._plan = [];

              ctx.clearLastMTR();
              if (ctx.DebugMTR) {
                ctx.clearLastMTRDebug();
              }
              ctx.HasPausedPartialPlan = false;
              ctx.clearPartialPlanQueue();
              ctx.IsDirty = false;

              return;
            }
          });

          this.LastStatus = this._currentTask?.operator(ctx);

          // If the operation finished successfully, we set task to null so that we dequeue the next task in the plan the following tick.
          if (this.LastStatus === TaskStatus.Success) {
            if (this.onCurrentTaskCompletedSuccessfully) {
              this.onCurrentTaskCompletedSuccessfully(this._currentTask);
            }

            // All effects that is a result of running this task should be applied when the task is a success.
            this._currentTask.Effects.forEach((effect) => {
              if (effect.Type === EffectType.PlanAndExecute) {
                if (this.onApplyEffect) {
                  this.onApplyEffect(effect);
                }
                effect.apply(ctx);
              }
            });

            this._currentTask = null;
            if (this._plan.length === 0) {
              ctx.clearLastMTR();

              if (ctx.DebugMTR) {
                ctx.clearLastMTRDebug();
              }

              ctx.IsDirty = false;

              if (allowImmediateReplan) {
                this.tick(domain, ctx, false);
              }
            }
          } else if (this.LastStatus === TaskStatus.Failure) {
            // If the operation failed to finish, we need to fail the entire plan, so that we will replan the next tick.
            if (this.onCurrentTaskFailed) {
              this.onCurrentTaskFailed(this._currentTask);
            }

            this._currentTask = null;
            this._plan = [];

            ctx.clearLastMTR();
            if (ctx.DebugMTR) {
              ctx.clearLastMTRDebug();
            }

            ctx.HasPausedPartialPlan = false;
            ctx.clearPartialPlanQueue();
            ctx.IsDirty = false;
          } else if (this.onCurrentTaskContinues) {
            // Otherwise the operation isn't done yet and need to continue.
            this.onCurrentTaskContinues(this._currentTask);
          }
        } else {
          // This should not really happen if a domain is set up properly.
          this._currentTask = null;
          this.LastStatus = TaskStatus.Failure;
        }
      }

      if (this._currentTask === null && this._plan.length === 0 && isTryingToReplacePlan === false &&
        (decompositionStatus === DecompositionStatus.Failed ||
          decompositionStatus === DecompositionStatus.Rejected)) {
        this.LastStatus = TaskStatus.Failure;
      }
    }
  }


  reset(ctx) {
    this._plan = [];

    if (this._currentTask !== null && this._currentTask instanceof PrimitiveTask) {
      this._currentTask.stop(ctx);
    }
    this._currentTask = null;
  }

  getPlan() {
    return this._plan;
  }

  getCurrentTask() {
    return this._currentTask;
  }
}
export default Planner;
