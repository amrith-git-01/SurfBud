import { useContext } from "react";
import { SSEContext } from "@/contexts/SSEContext";

export function useSSE() {
  return useContext(SSEContext);
}
