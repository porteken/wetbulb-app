import { handlers } from "@/testing/handlers";
import { setupServer } from "msw/node";

export const server = setupServer(...handlers);
