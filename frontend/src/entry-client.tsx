import { createStartHandler } from "@tanstack/react-start";
import { getRouter } from "./router";

console.log("SOCVision STARTED");

const router = getRouter();
console.log("Router Loaded");

const handler = createStartHandler({
  router,
});

handler();
console.log("Hydration Complete");
