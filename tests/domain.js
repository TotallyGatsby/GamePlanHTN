import { test } from "uvu";
import log from "loglevel";
import Context from "../src/context.js";
import Domain from "../src/domain.js";
import TaskStatus from "../src/taskStatus.js";

log.enableAll();

const example1 = {
  name: "Get A, B, then C",
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
            context.setDone();

            return TaskStatus.Continue;
          },
        },
      ],
    },
  ],
  actions: {

  },
  conditions: {

  },
  effects: {

  },
};

// This style is planned but not supported yet
/*
let example2 = {
  name: "Get A, B, then C",
  tasks: [
    {
      name: "GetC",
      type: "select",
      tasks: [
        {
          conditions: ["hasAandB", "hasNotC"],
          actions: ["getC"],
          effects: ["hasC"],
        },
      ],
    },
    {
      name: "GetAandB",
      type: "sequence",
      tasks: [
        {
          conditions: ["hasNotANorB"],
          actions: ["getA"],
          effects: ["hasA"],
        }, {
          actions: ["getA"],
          effects: ["hasB"],
        },
      ],
    }, {
      name: "Done",
      type: "sequence",
      tasks: [
        {
          name: "Done",
          actions: ["done"],
        },
      ],
    },
  ],
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
*/

test("Create a Domain successfully", () => {
  new Domain(example1);
});

test("Attempt to plan a domain successfully", () => {
  const testDomain = new Domain(example1);
  const context = new Context();

  context.init();
  const plan = [];

  const status = testDomain.findPlan(context, plan);

  log.info(status);
  log.info(JSON.stringify(plan));
});

test.run();
