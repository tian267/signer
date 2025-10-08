import { z } from "zod";
import ipaddr from "ipaddr.js";

export const SignReq = z.object({
  device_id: z.string().min(3).max(64),
  ip: z.string().refine(v => {
    try { const a = ipaddr.parse(v); return a.kind() === "ipv4"; } catch { return false; }
  }, "ip must be IPv4"),
  dns: z.string().min(1).max(253).optional(),
  days: z.number().int().min(1).max(365).optional()
});

export function isPrivateIPv4(s) {
  try {
    const a = ipaddr.parse(s);
    if (a.kind() !== "ipv4") return false;
    return a.range() === "private" || a.range() === "linkLocal";
  } catch { return false; }
}