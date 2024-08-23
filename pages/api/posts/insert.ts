// pages/api/posts/insert.ts

import { NextApiRequest, NextApiResponse } from "next";
import { PostService } from "@/services/PostService";
import { Post } from "@/models_/Post";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { content, organizationid, privacylevel, postphotos } = req.body;
  const post = new Post(
    "",
    organizationid,
    "",
    content,
    privacylevel,
    undefined,
    undefined,
    postphotos
  );
  const service = new PostService();

  try {
    const result = await service.insertPost(post);
    return res.status(201).json(result);
  } catch (e) {
    return res.status(500).json({ message: e });
  }
}
