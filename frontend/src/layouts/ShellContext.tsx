import { createContext, useContext } from "react";
export type ShellArea = "customer" | "advisor" | "admin";
export const ShellContext = createContext<ShellArea | null>(null);
/** Các header/sidebar cũ tự ẩn khi được render trong Layout thống nhất. */
export function useInAppShell() { return useContext(ShellContext) !== null; }
