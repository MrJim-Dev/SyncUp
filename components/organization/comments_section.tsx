import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  insertComment,
  fetchComments,
  deleteComment,
  updateComment,
  check_permissions,
  getAuthorDetails,
} from "@/lib/posts_tab";
import { useUser } from "@/context/user_context";
import { PostComments } from "@/types/post_comments";
import { UserCircleIcon, EllipsisVerticalIcon } from "@heroicons/react/24/solid";
import { CombinedUserData } from "@/types/combined_user_data";
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';

import { timeAgo } from "@/lib/utils";

const commentSchema = z.object({
  commentText: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(100, "Comment cannot exceed 100 characters"),
});

interface CommentsSectionProps {
  postId: string;
  organizationId: string;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ postId, organizationId }) => {
  const { user } = useUser();
  const [comments, setComments] = useState<PostComments[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [canComment, setCanComment] = useState(false);
  const [canDeleteComments, setCanDeleteComments] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const { register, handleSubmit, reset } = useForm<{ commentText: string }>({
    resolver: zodResolver(commentSchema),
  });

  const isLoggedIn = user && user.id && user.id.length > 0;

  const supabaseStorageBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`;

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!isLoggedIn) {
        setCanComment(false);
        setCanDeleteComments(false);
        return;
      }
      try {
        const [commentPermission, deletePermission] = await Promise.all([
          check_permissions(user.id!, organizationId, "comment_on_posts"),
          check_permissions(user.id!, organizationId, "delete_comments"),
        ]);
        setCanComment(!!commentPermission);
        setCanDeleteComments(!!deletePermission);
      } catch (error) {
        console.error("Error checking permissions", error);
        setCanComment(false);
        setCanDeleteComments(false);
      }
    };
    fetchPermissions();
  }, [isLoggedIn, user?.id, organizationId]);

  useEffect(() => {
    const loadComments = async () => {
      try {
        const data = await fetchComments(postId);
        if (data && !data.error) {
          const commentsWithAuthorDetails = await Promise.all(
            data.data.map(async (comment: PostComments) => {
              const authorDetails = await getAuthorDetails(comment.authorid!);
              const combined_user_data: CombinedUserData | undefined = authorDetails
                ? {
                    first_name: authorDetails.first_name || "",
                    last_name: authorDetails.last_name || "",
                    profilepicture: authorDetails.profilepicture
                      ? `${supabaseStorageBaseUrl}/${authorDetails.profilepicture}`
                      : undefined,
                  }
                : undefined;
              return {
                ...comment,
                combined_user_data,
              };
            })
          );
          setComments(
            commentsWithAuthorDetails.sort(
              (a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
          );
        } else {
          setComments([]);
        }
      } catch (error) {
        console.error("Error loading comments:", error);
      }
    };
    loadComments();
  }, [postId]);

  const onSubmit = async (data: { commentText: string }) => {
    if (!isLoggedIn || !canComment) return;

    setIsLoading(true);
    try {
      const newCommentResult = await insertComment({
        postid: postId,
        authorid: user.id,
        comment: data.commentText,
      });

      if (newCommentResult && newCommentResult.data) {
        const authorDetails = await getAuthorDetails(user.id!); // Ensure this is correct
        const newComment = {
          ...newCommentResult.data,
          created_at: new Date().toISOString(), // Set the current timestamp
          combined_user_data: {
            first_name: authorDetails.first_name || "",
            last_name: authorDetails.last_name || "",
            profilepicture: authorDetails.profilepicture
              ? `${supabaseStorageBaseUrl}/${authorDetails.profilepicture}`
              : undefined,
          },
        };

        setComments((prev) => [newComment, ...prev]);
        reset();
      } else {
        console.error("Failed to submit comment.");
      }
    } catch (error) {
      console.error("Failed to submit comment.", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (commentId: string, authorId: string) => {
    if (!canDeleteComments && user?.id !== authorId) return;
    try {
      await deleteComment(commentId, user?.id!);
      setComments((prev) => prev.filter((comment) => comment.commentid !== commentId));
    } catch (error) {
      console.error("Failed to delete comment.");
    }
  };

  const handleEdit = (commentId: string, commentText: string) => {
    setEditingCommentId(commentId);
    setEditingText(commentText);
  };

  const handleUpdateComment = async () => {
    if (!editingCommentId || !editingText) return;

    setIsUpdating(editingCommentId);
    try {
      const updatedCommentResult = await updateComment(
        editingCommentId,
        { comment: editingText },
        { commentid: editingCommentId, comment: editingText }
      );
      if (updatedCommentResult && updatedCommentResult.data) {
        setComments((prev) =>
          prev.map((comment) =>
            comment.commentid === editingCommentId
              ? {
                  ...updatedCommentResult.data,
                  combined_user_data: comment.combined_user_data,
                }
              : comment
          )
        );
        setEditingCommentId(null);
        setEditingText(null);
      } else {
        console.error("Failed to update comment.");
      }
    } catch (error) {
      console.error("Failed to update comment.", error);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingText(null);
  };

  const formatDateTime = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  

  return (
    <div className="bg-eerieblack p-4 rounded-lg shadow space-y-4 max-w-4xl mx-auto font-poppins">
      {isLoggedIn && canComment ? (
        <form onSubmit={handleSubmit(onSubmit)} className="mb-4">
          <textarea
            {...register("commentText")}
            placeholder="Enter your comment..."
            rows={2}
            maxLength={100}
            className="w-full p-2 bg-charleston text-light rounded-md border border-fadedgrey focus:outline-none focus:border-primary"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className={`mt-2 bg-primary hover:bg-primarydark text-white font-semibold py-2 px-4 rounded`}
          >
            {isLoading ? "Submitting..." : "Submit"}
          </button>
        </form>
      ) : !isLoggedIn ? (
        <p className="text-white">You must be logged in to comment.</p>
      ) : (
        <p className="text-white">You do not have permission to comment on this post.</p>
      )}

      <button
        onClick={() => setShowComments(!showComments)}
        className="mb-4 text-sm text-blue-500"
      >
        {showComments ? "Hide Comments" : `Show Comments (${comments.length})`}
      </button>

      {showComments &&
        (comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.commentid} className="bg-raisinblack p-3 rounded-md">
              <div className="flex items-center space-x-3">
                {comment.combined_user_data?.profilepicture ? (
                  <img
                    src={comment.combined_user_data.profilepicture}
                    alt="Profile"
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <UserCircleIcon className="h-10 w-10 text-white" />
                )}
                <div className="flex-1">
                  <p className="text-sm text-light">
                    {comment.combined_user_data?.first_name}{" "}
                    {comment.combined_user_data?.last_name}
                  </p>
                  <p className="text-xs text-fadedgrey">{timeAgo(comment.created_at)} ago</p>
                </div>
                <Menu as="div" className="relative">
                  <Menu.Button>
                    <EllipsisVerticalIcon className="h-5 w-5 text-gray-400" />
                  </Menu.Button>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 w-48 mt-2 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <div className="p-1">
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => handleEdit(comment.commentid, comment.comment)}
                              className={`${
                                active ? 'bg-gray-100' : ''
                              } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-900`}
                            >
                              Edit
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => handleDelete(comment.commentid, comment.authorid!)}
                              className={`${
                                active ? 'bg-gray-100' : ''
                              } group flex w-full items-center rounded-md px-2 py-2 text-sm text-red-600`}
                            >
                              Delete
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>
              {editingCommentId === comment.commentid ? (
                <div>
                  <textarea
                    value={editingText || ""}
                    onChange={(e) => setEditingText(e.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-lg border border-[#424242] bg-[#1c1c1c] p-2 text-sm text-white"
                  />
                  <div className="mt-2 flex space-x-4">
                    <button
                      onClick={handleUpdateComment}
                      className="text-sm text-blue-500"
                      disabled={isUpdating === comment.commentid}
                    >
                      {isUpdating === comment.commentid ? "Updating..." : "Update"}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="text-sm text-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-light">{comment.comment}</p>
              )}
            </div>
          ))
        ) : (
          <p className="text-white">No comments yet.</p>
        ))}
    </div>
  );
};

export default CommentsSection;
