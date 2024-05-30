// pages/api/auth/signout.ts

import { NextApiRequest, NextApiResponse } from "next";
import { AuthService } from "@/services/AuthService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const service = new AuthService();

  try {
    await service.signOut();
    return res.status(204).end();
  } catch (e) {
    return res.status(500).json({ message: e });
  }
}
