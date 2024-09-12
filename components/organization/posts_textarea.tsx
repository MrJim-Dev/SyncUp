import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast, ToastContainer } from "react-toastify";
import { PhotoIcon, XCircleIcon, UserCircleIcon } from "@heroicons/react/24/solid";
import { useUser } from "@/context/user_context";
import TagsInput from "@/components/custom/tags-input";
import "react-toastify/dist/ReactToastify.css";
import { Switch } from "@headlessui/react";
import { insertPost, updatePost, checkIsMemberOfOrganization, getUserProfileById, check_permissions } from "@/lib/groups/posts_tab";
import { createClient } from "@/lib/supabase/client";
import { Posts } from "@/types/posts";


const postSchema = z.object({
  content: z.string().min(1, "Content is required").max(500, "Content cannot exceed 500 characters"),
  privacylevel: z.array(z.string()).optional(),
  targetmembershipid: z.string().optional(),
});

interface Role {
  role_id: string;
  role: string;
}

interface Membership {
  membershipid: string;
  name: string;
}

interface PostsTextAreaProps {
  organizationid: string;
  postsData: Posts[];
  setPostsData: React.Dispatch<React.SetStateAction<Posts[]>>;
  editingPost: Posts | null;
  cancelEdit: () => void;
  setEditingPost: React.Dispatch<React.SetStateAction<Posts | null>>;
  availableRoles: { id: string; name: string }[];
  availableMemberships: Membership[];
}

export default function PostsTextArea({
  organizationid,
  postsData,
  setPostsData,
  editingPost,
  cancelEdit,
  setEditingPost,
  availableRoles,
  availableMemberships,
}: PostsTextAreaProps) {
  const { register, handleSubmit, control, setValue, reset, watch } = useForm({
    resolver: zodResolver(postSchema),
  });
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (editingPost) {
      console.log("Editing post:", editingPost);
      setValue("content", editingPost.content);

      if (
        Array.isArray(editingPost.privacylevel) &&
        editingPost.privacylevel.length === 0 &&
        !editingPost.targetmembershipid
      ) {
        setIsPublic(true);
      } else {
        setIsPublic(false);
      }

      const roleNames = Array.isArray(editingPost.privacylevel)
        ? editingPost.privacylevel.map((roleId: string) => {
            const role = availableRoles.find((role) => role.id === roleId);
            return role ? role.name : roleId;
          })
        : [];
      setValue("privacylevel", roleNames);

      setPhotos(editingPost.postphotos || []);

      const membershipName =
        availableMemberships.find(
          (membership) => membership.membershipid === editingPost.targetmembershipid
        )?.name || "";
      setValue("targetmembershipid", membershipName);
    }
  }, [editingPost, setValue, availableRoles, availableMemberships]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.id) {
        const { data, error } = await getUserProfileById(user.id);
        if (data) {
          setProfilePicture(
            data.profilepicture
              ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${data.profilepicture}`
              : null
          );
        } else {
          console.error("Error fetching user profile:", error);
        }
      }
    };
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    const checkMembershipAndPermissions = async () => {
      if (organizationid) {
        const isMember = await checkIsMemberOfOrganization(organizationid);
        setIsMember(isMember);
        if (user?.id) {
          const createPermission = await check_permissions(
            user.id,
            organizationid,
            "create_posts"
          );
          setCanCreate(createPermission);
        }
      }
    };
    checkMembershipAndPermissions();
  }, [organizationid, user]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    const newPhotos = [...photos];

    for (const file of imageFiles) {
      setIsLoading(true);
      const fileName = `post_${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const { data: uploadResult, error } = await createClient()
        .storage.from("post-images")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadResult) {
        newPhotos.push(uploadResult.path);
      } else {
        console.error("Error uploading image:", error);
      }
    }

    setPhotos(newPhotos);
    setIsLoading(false);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prevPhotos) => prevPhotos.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    reset();
    setPhotos([]);
    setEditingPost(null);
    setValue("privacylevel", []);
    setValue("targetmembershipid", "");
  };

  const onSubmit = async (formData: any) => {
    console.log("Form submitted with data:", formData);
    setIsLoading(true);
    try {
      let privacyArray: string[] = [];
      let membershipId: string | null = null;
  
      if (!isPublic) {
        privacyArray = formData.privacylevel.map((roleName: string) => {
          const role = availableRoles.find((role) => role.name === roleName);
          return role ? role.id : roleName;
        });
        membershipId = formData.targetmembershipid
          ? availableMemberships.find((membership) => membership.name === formData.targetmembershipid)?.membershipid ?? null
          : null;
      } else {
        privacyArray = [];
        membershipId = formData.targetmembershipid
          ? availableMemberships.find((membership) => membership.name === formData.targetmembershipid)?.membershipid ?? null
          : null;
      }
  
      const postData = {
        ...formData,
        organizationid,
        postphotos: photos,
        privacylevel: privacyArray,
        targetmembershipid: membershipId,
      };

      console.log("Post data to be submitted:", postData);
  
      const { data: postResponse, error } = editingPost
        ? await updatePost({ ...postData, postid: editingPost.postid })
        : await insertPost(postData, organizationid);
  
      if (!error) {
        if (editingPost) {
          setPostsData((prevPosts) =>
            prevPosts.map((post) =>
              post.postid === postResponse.postid ? postResponse : post
            )
          );
          toast.success("Post updated successfully");
        } else {
          setPostsData([postResponse, ...postsData]);
          toast.success("Post created successfully");
        }
        resetForm();
      } else {
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error("Failed to create/update post:", error);
      toast.error("Failed to create/update post. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const contentValue = watch("content");

  if (!isMember) return null;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="relative rounded-2xl bg-[#3b3b3b] p-6 shadow-lg"
    >
      <div className="rounded-2xl">
        <label htmlFor="content" className="sr-only">
          Description
        </label>
        <div className="mb-4 flex items-center">
          <div>
            {profilePicture ? (
              <img
                src={profilePicture}
                alt="Profile"
                className="h-10 w-10 rounded-full object-cover"
                width={40}
                height={40}
              />
            ) : (
              <UserCircleIcon className="h-10 w-10 text-white" />
            )}
          </div>
          <div className="relative ml-4 flex-grow">
            <textarea
              id="content"
              {...register("content")}
              className="min-h-[150px] w-full resize-none rounded-2xl border border-[#3d3d3d] bg-[#171717] p-3 text-white focus:ring-0"
              placeholder="Write a post..."
              maxLength={500}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${target.scrollHeight}px`;
              }}
              disabled={!canCreate && !editingPost}
            />
            <div className="absolute bottom-2 right-2 text-sm text-[#bebebe]">
              {contentValue?.length || 0}/500
            </div>
          </div>
        </div>

        <div className="flex items-center mb-4">
          <label className="text-white">Public:</label>
          <Switch
            checked={isPublic}
            onChange={setIsPublic}
            className={`${isPublic ? "bg-primary" : "bg-gray-700"}
              relative inline-flex h-6 w-11 items-center rounded-full ml-3`}
          >
            <span
              className={`${
                isPublic ? "translate-x-6" : "translate-x-1"
              } inline-block h-4 w-4 transform bg-white rounded-full`}
            />
          </Switch>
        </div>

        <div className="mb-4">
          <Controller
            name="privacylevel"
            control={control}
            defaultValue={[]}
            render={({ field }) => (
              <TagsInput
                value={field.value}
                onChange={(tags) => field.onChange(tags)}
                suggestions={availableRoles.map((role) => role.name)}
                placeholder="Add roles to make exclusive to..."
                disabled={isPublic}
              />
            )}
          />
        </div>

        <div className="mb-4">
          <Controller
            name="targetmembershipid"
            control={control}
            defaultValue={null}
            render={({ field }) => (
              <TagsInput
                value={field.value ? [field.value] : []}
                onChange={(tags) => field.onChange(tags.length ? tags[0] : null)}
                suggestions={availableMemberships.map((membership) => membership.name)}
                placeholder="Add membership to make exclusive to..."
                disabled={isPublic}
              />
            )}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            id="file-input"
            multiple
            onChange={handleFileChange}
            className="hidden"
            disabled={!canCreate && !editingPost}
          />
          <label htmlFor="file-input" className="cursor-pointer p-3">
            <PhotoIcon className="h-6 w-6 text-white" />
          </label>
          <div className="flex-grow"></div>
          <button
            type="submit"
            className={`rounded-2xl p-3 text-white shadow-lg ${isLoading || !(contentValue ?? "").trim() ? "cursor-not-allowed bg-[#171717]" : "bg-primary hover:bg-[#37996b]"}`}
            disabled={
              isLoading || !(contentValue ?? "").trim() || (!canCreate && !editingPost)
            }
          >
            {isLoading
              ? editingPost
                ? "Updating..."
                : "Creating..."
              : editingPost
                ? "Update"
                : "Create"}
          </button>
          {editingPost && (
            <button
              type="button"
              onClick={() => {
                cancelEdit();
                resetForm();
              }}
              className="ml-2 rounded-2xl bg-red-600 p-3 text-white shadow-lg hover:bg-red-700"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {photos.map((photo, index) => (
            <div key={index} className="relative">
              <img
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-images/${photo}`}
                alt={`Attachment ${index + 1}`}
                className="h-20 w-20 rounded-md object-cover"
                width={80}
                height={80}
              />
              <button
                type="button"
                onClick={() => handleRemovePhoto(index)}
                className="absolute right-0 top-0 rounded-full bg-black bg-opacity-75 p-1 text-white"
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      </div>
      <ToastContainer />
    </form>
  );
}