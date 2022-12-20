# GamePlanHTN

A simple but powerful HTN planner in Javascript based on the excellent work of [FluidHTN](https://github.com/ptrefall/fluid-hierarchical-task-network). There are several changes to the library to make it more idiomatic JS rather than C# (these are detailed below.)

![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)
![Build](https://github.com/TotallyGatsby/GamePlanHTN/actions/workflows/ci.yml/badge.svg)

### THIS LIBRARY IS IN ACTIVE DEVELOPMENT
Please do not use it for production use cases. Many of the unit tests are passing, but several critical cases are not, and the API for creating and managing objects may change without notice.

## Features
* GamePlanHTN is a total-order forward decomposition planner, as described by Troy Humphreys in his [GameAIPro article](http://www.gameaipro.com/GameAIPro/GameAIPro_Chapter12_Exploring_HTN_Planners_through_Example.pdf), a port of [FluidHTN](https://github.com/ptrefall/fluid-hierarchical-task-network).
* Define Domains via simple JS Object format.
* Partial planning.
* Domain splicing. [In progress!]
* Domain slots for run-time splicing. [In progress!]
* Replan only when plans complete/fail or when world state changes.
* Early rejection of replanning that cannot be completed.
* Extensible
* Decomposition logging, for debugging.
* 100 unit tests implemented and passing (and growing!)


# Library
## Usage

### Creating a Domain
Defining a domain is done via a Javascript object. Functions can be embedded directly into the domain definition, or passed into the domain later if you'd prefer to keep definitions strictly JSON.

```js
new Domain({
  name: "MyDomain",
  tasks: [
    {
      name: "GetC",
      type: "select",
      tasks: [
        {
          name: "Get C (Primitive Task)",
          conditions: [
            // Has A and B
            (context) => context.hasState("HasA") && context.hasState("HasB"),
            // Has NOT C
            (context) => !context.hasState("HasC"),
          ],
          operator: () => {
            log.info("Get C");

            return TaskStatus.Success;
          },
          effects: [
            // Has C
            (context) => context.setState("HasC"),
          ],
        },
      ],
    },
    {
      name: "GatAandB",
      type: "sequence",
      tasks: [
        {
          name: "Get A (Primitive Task)",
          conditions: [
            // Has NOT A NOR B
            (context) => !(context.hasState("HasA") && context.hasState("HasB")),
          ],
          operator:
            // Get A
            () => {
              log.info("Get A");

              return TaskStatus.Success;
            },
          effects: [
            // Has A
            (context) => context.setState("HasA"),
          ],
        }, {
          name: "Get B (Primitive Task)",
          operator:
            // Get A
            () => {
              log.info("Get B");

              return TaskStatus.Success;
            },
          effects: [
            // Has B
            (context) => context.setState("HasB"),
          ],
        },
      ],
    },
    {
      name: "Done",
      type: "select",
      tasks: [
        {
          name: "Done",
          operator: (context) => {
            log.info("Done");
            context.Done = true;
            return TaskStatus.Continue;
          },
        },
      ],
    },
  ],
});
```

### Creating a Context

A context is used to track our world state for the purposes of planning. A Context contains methods for setting/getting world state, and starts with a simple set of `GetState()`, `SetState()` and `HasState()` methods, but in most cases you will want to add functions to the Context object.

There are a few significant changes from FluidHTN:
1) GamePlanHTN uses object keys for world state rather than an array indexed by an enum, this simplifies finding worldstate to `context.WorldState.HasC` rather than `context.WorldState[(int)MyWorldState.HasC]`
1) The Context object's function set is mutable at runtime. You can assign functions directly to it at runtime, which means you do not necessarily need to subclass it for simple cases.

```js
let context = new Context();

context.WorldState = {
  HasA: 0,
  HasB: 0,
  HasC: 0,
};

context.init();
```

### Planning
With a context and a domain, we can now perform planning by ticking the planner until it sets `Done` to true on the context.

```js
let domain = new Domain({ /* see large definition above */});
let context = new Context();
context.WorldState = {
  HasA: 0,
  HasB: 0,
  HasC: 0,
};

let planner = new Planner();
ctx.init();

while (!context.Done) {
    planner.tick(domain, context);
}
```
