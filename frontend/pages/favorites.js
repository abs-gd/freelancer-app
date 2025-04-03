import { useState, useEffect } from "react";
import { gql, useQuery, useMutation } from "@apollo/client";
import { useRouter } from "next/router";
import { getAuthToken } from "../utils/auth";
import toast from "react-hot-toast";

const GET_PROJECTS = gql`
  query {
    getProjects {
      id
      name
      isActive
    }
  }
`;

const GET_FAVORITES = gql`
  query GetFavorites($projectId: String!) {
    getFavorites(projectId: $projectId) {
      id
      title
      url
      category
    }
  }
`;

const ADD_FAVORITE = gql`
  mutation AddFavorite(
    $projectId: String!
    $title: String!
    $url: String!
    $category: String!
  ) {
    addFavorite(
      projectId: $projectId
      title: $title
      url: $url
      category: $category
    ) {
      id
    }
  }
`;

const DELETE_FAVORITE = gql`
  mutation DeleteFavorite($favoriteId: String!) {
    deleteFavorite(favoriteId: $favoriteId)
  }
`;

const EDIT_FAVORITE = gql`
  mutation EditFavorite(
    $favoriteId: String!
    $title: String!
    $url: String!
    $category: String!
  ) {
    updateFavorite(
      favoriteId: $favoriteId
      title: $title
      url: $url
      category: $category
    ) {
      id
      title
      url
      category
    }
  }
`;

export default function FavoritesPage() {
  const router = useRouter();
  const [projectId, setProjectId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [form, setForm] = useState({ title: "", url: "", category: "" });

  const { data: projectsData } = useQuery(GET_PROJECTS);
  const { data: favoritesData, refetch } = useQuery(GET_FAVORITES, {
    variables: { projectId },
    skip: !projectId,
  });

  const [addFavorite] = useMutation(ADD_FAVORITE);
  const [deleteFavorite] = useMutation(DELETE_FAVORITE);
  const [editFavorite] = useMutation(EDIT_FAVORITE);


  useEffect(() => {
    if (!getAuthToken()) router.push("/login");

    if (projectsData?.getProjects) {
      const active = projectsData.getProjects.find((a) => a.isActive);
      if (active) setProjectId(active.id);
    }
  }, [projectsData, router]);

  const handleAddFavorite = async () => {
    const { title, url, category } = form;
    if (!title || !url || !category) return toast.error("All fields required");

    await addFavorite({ variables: { projectId, title, url, category } });
    toast.success("Favorite added");
    setForm({ title: "", url: "", category: "" });
    setSelectedCategory(category);
    refetch();
  };

  const handleDelete = async (id) => {
    await deleteFavorite({ variables: { favoriteId: id } });
    toast.success("Favorite deleted");
    refetch();
  };

  const grouped = {};
  (favoritesData?.getFavorites || []).forEach((fav) => {
    if (!grouped[fav.category]) grouped[fav.category] = [];
    grouped[fav.category].push(fav);
  });

  const categories = Object.keys(grouped);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", url: "", category: "" });

  const startEditing = (fav) => {
    setEditingId(fav.id);
    setEditForm({ title: fav.title, url: fav.url, category: fav.category });
  };

  const handleEditSave = async () => {
    await editFavorite({ variables: { favoriteId: editingId, ...editForm } });
    toast.success("Favorite updated");
    setEditingId(null);
    refetch();
  };

  return (
    <div className="md:p-6 p-3">
      <h1 className="text-4xl font-medium mb-6">⭐ Favorites</h1>

      {/* Category Tabs */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded capitalize ${
              selectedCategory === cat
                ? "bg-green-600 text-white"
                : "bg-green-200 cursor-pointer"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Favorites List */}
      {selectedCategory && (
        <div className="mb-6">
          {/*<h2 className="text-xl mb-2 capitalize md:block hidden">{selectedCategory}</h2>*/}
          <ul className="space-y-1">
            {grouped[selectedCategory]?.map((fav) => (
              <li
                key={fav.id}
                className="flex items-center justify-between bg-white md:p-3 p-1 rounded shadow text-sm"
              >
                {editingId === fav.id ? (
                  <div className="flex flex-col gap-2 w-full">
                    <input
                      type="text"
                      className="border rounded p-1"
                      value={editForm.title}
                      onChange={(e) =>
                        setEditForm({ ...editForm, title: e.target.value })
                      }
                    />
                    <input
                      type="url"
                      className="border rounded p-1"
                      value={editForm.url}
                      onChange={(e) =>
                        setEditForm({ ...editForm, url: e.target.value })
                      }
                    />
                    <input
                      type="text"
                      className="border rounded p-1"
                      value={editForm.category}
                      onChange={(e) =>
                        setEditForm({ ...editForm, category: e.target.value })
                      }
                    />
                    <div className="flex gap-6 mt-1">
                      <button
                        onClick={handleEditSave}
                        className="text-green-600 text-lg cursor-pointer"
                      >
                        💾 Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-red-600 text-lg cursor-pointer"
                      >
                        ❌ Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-start md:gap-6 gap-2 items-center w-full">
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEditing(fav)}
                        className="text-lg text-blue-500 cursor-pointer"
                      >
                        📝
                      </button>
                      <button
                        onClick={() => handleDelete(fav.id)}
                        className="text-lg text-red-500 cursor-pointer"
                      >
                        ❌
                      </button>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <img
                        src={`https://www.google.com/s2/favicons?sz=32&domain_url=${fav.url}`}
                        alt="favicon"
                        className="w-7 h-7"
                      />
                      <a
                        href={fav.url}
                        title={fav.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="capitalize text-blue-600 text-lg cursor-pointer"
                      >
                        {fav.title}
                      </a>
                      <span className="mt-1">{fav.url}</span>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add New Favorite */}
      <div className="w-full mt-20 bg-green-100 p-4 rounded shadow">
        <h3 className="text-2xl text-center font-medium mb-4">Add favorite</h3>
        <div className="md:flex md:justify-between md:gap-2">
          <input
            type="text"
            placeholder="Title"
            className="w-full p-2 border rounded h-[50px] md:mb-0 mb-2"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            type="url"
            placeholder="URL"
            className="w-full p-2 border rounded h-[50px] md:mb-0 mb-2"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
          <input
            type="text"
            placeholder="Category"
            className="w-full p-2 border rounded h-[50px] md:mb-0 mb-2"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <button
            onClick={handleAddFavorite}
            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded cursor-pointer h-[50px] md:w-fit w-full"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
