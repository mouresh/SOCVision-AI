import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  console.log("Initializing QueryClient...");
  const queryClient = new QueryClient();
  console.log("QueryClient Initialized");

  console.log("Initializing Router...");
  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });
  console.log("Router Initialized");

  return router;
};
