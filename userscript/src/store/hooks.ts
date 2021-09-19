import { createTypedHooks } from "easy-peasy";
import type { RootStore } from "./store";

const typedHooks = createTypedHooks<RootStore>();

// export the typed hooks
export const useStoreActions = typedHooks.useStoreActions;
export const useStoreDispatch = typedHooks.useStoreDispatch;
export const useStoreState = typedHooks.useStoreState;
