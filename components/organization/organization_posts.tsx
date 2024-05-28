import { useEffect, useState, useRef, useCallback } from "react";
import PostsCard from "./posts_card";
import PostsTextArea from "./posts_textarea";
import { fetchPosts } from "@/lib/posts";
import Divider from "./divider";
import { createClient, getUser } from "@/lib/supabase/client";
import { getUserOrganizationInfo, check_permissions } from "@/lib/organization";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { Posts } from "@/types/posts"; // Ensure this import matches your actual types

interface OrganizationPostsComponentProps {
  organizationid: string;
}

const OrganizationPostsComponent = ({
  organizationid,
}: OrganizationPostsComponentProps) => {
  const [postsData, setPostsData] = useState<Posts[]>([]);
  const [editingPost, setEditingPost] = useState<Posts | null>(null);
  const [isMemberOfOrganization, setIsMemberOfOrganization] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [postsPerPage] = useState(5);
  const [loading, setLoading] = useState(true);
  const [userOrgInfo, setUserOrgInfo] = useState<any>(null);
  const [permissions, setPermissions] = useState<{ [key: string]: boolean }>({});
  const postsTextAreaRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const fetchData = useCallback(
    async (isMember: boolean) => {
      const { data, error } = await fetchPosts(organizationid);
      if (!error) {
        const visibleData = isMember
          ? data
          : data.filter((post) => post.privacylevel !== "private");
        setPostsData(visibleData);
        // console.log("isMemberOfOrganization", isMember);
      } else {
        console.error("Error fetching posts:", error);
      }
      setLoading(false);
    },
    [organizationid]
  );

  useEffect(() => {
    const loadData = async () => {
      const { user } = await getUser();
      if (user) {
        const userOrgInfo = await getUserOrganizationInfo(user.id, organizationid);
        setUserOrgInfo(userOrgInfo);
        const isMember = userOrgInfo != null;
        setIsMemberOfOrganization(isMember);
        fetchData(isMember);

        // Check permissions for different actions
        const permissionKeys = [
          "create_posts",
          "edit_posts",
          "delete_posts",
          "comment_on_posts",
        ];
        const permissions = await Promise.all(
          permissionKeys.map((key) => check_permissions(user.id, organizationid, key))
        );
        const permissionsObj = permissionKeys.reduce(
          (acc, key, index) => ({ ...acc, [key]: permissions[index] }),
          {}
        );
        setPermissions(permissionsObj);
      } else {
        fetchData(false); // Fetch posts for non-logged-in users
        setLoading(false); // Set loading to false after fetching
      }
    };

    loadData();

    supabase
      .channel("posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        fetchData(isMemberOfOrganization);
      })
      .subscribe();
  }, [organizationid, fetchData, supabase, isMemberOfOrganization]);

  useEffect(() => {
    if (editingPost && postsTextAreaRef.current) {
      const element = postsTextAreaRef.current;
      const offset =
        element.getBoundingClientRect().top +
        window.pageYOffset -
        window.innerHeight / 2 +
        element.clientHeight / 2;
      window.scrollTo({ top: offset, behavior: "smooth" });
    }
  }, [editingPost]);

  const startEdit = (post: Posts) => {
    setEditingPost(post);
  };

  const cancelEdit = () => {
    setEditingPost(null);
  };

  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const currentPosts = postsData.slice(indexOfFirstPost, indexOfLastPost);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div className="mx-auto max-w-4xl">
      {loading ? (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-light">Loading...</h2>
          </div>
        </div>
      ) : (
        <div className="flex flex-col justify-center">
          <h2 className="mb-8 text-center text-2xl font-semibold text-light">
            Organization Posts
          </h2>
          {permissions.create_posts && userOrgInfo && (
            <div ref={postsTextAreaRef}>
              <PostsTextArea
                organizationid={organizationid}
                postsData={postsData}
                setPostsData={setPostsData}
                editingPost={editingPost}
                cancelEdit={cancelEdit}
                setEditingPost={setEditingPost}
              />
            </div>
          )}
          <div className="isolate max-w-6xl lg:max-w-none">
            {currentPosts.length > 0 ? (
              currentPosts.map((post, index) => (
                <div key={post.postid} className="mx-auto">
                  <PostsCard
                    post={post}
                    setPostsData={setPostsData}
                    postsData={postsData}
                    startEdit={startEdit}
                    canEdit={permissions.edit_posts}
                    canDelete={permissions.delete_posts}
                    canComment={permissions.comment_on_posts}
                  />
                  {index !== currentPosts.length - 1 && <Divider />}
                </div>
              ))
            ) : (
              <div
                className="mb-4 mt-5 rounded-lg bg-gray-800 p-4 text-sm text-blue-400"
                role="alert"
              >
                The organization has no posts available for you.
              </div>
            )}
          </div>
          <div className="mt-2 w-full">
            <nav className="flex items-center justify-between border-t border-gray-200 px-4 sm:px-0">
              <div className="-mt-px flex w-0 flex-1">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`inline-flex items-center border-t-2 border-transparent pr-1 pt-4 text-sm font-medium ${
                    currentPage === 1
                      ? "cursor-not-allowed text-gray-500"
                      : "text-light hover:border-primary hover:text-primary"
                  }`}
                >
                  <ArrowLeftIcon className="mr-3 h-5 w-5 text-light" aria-hidden="true" />
                  Previous
                </button>
              </div>
              <div className="hidden md:-mt-px md:flex">
                {Array.from(
                  { length: Math.ceil(postsData.length / postsPerPage) },
                  (_, i) => (
                    <button
                      key={i}
                      onClick={() => paginate(i + 1)}
                      className={`inline-flex items-center border-t-2 border-transparent px-4 pt-4 text-sm font-medium ${
                        currentPage === i + 1
                          ? "border-primarydark text-primary"
                          : "text-light hover:border-primary hover:text-primary"
                      }`}
                    >
                      {i + 1}
                    </button>
                  )
                )}
              </div>
              <div className="-mt-px flex w-0 flex-1 justify-end">
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === Math.ceil(postsData.length / postsPerPage)}
                  className={`inline-flex items-center border-t-2 border-transparent pl-1 pt-4 text-sm font-medium ${
                    currentPage === Math.ceil(postsData.length / postsPerPage)
                      ? "cursor-not-allowed text-gray-500"
                      : "text-light hover:border-primary hover:text-primary"
                  }`}
                >
                  Next
                  <ArrowRightIcon
                    className="ml-3 h-5 w-5 text-light"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationPostsComponent;
