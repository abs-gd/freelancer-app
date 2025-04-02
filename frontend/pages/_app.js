import { Toaster } from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  ApolloProvider,
  InMemoryCache,
  ApolloClient,
  useQuery,
  useMutation,
  gql,
} from "@apollo/client";
import { useEffect, useState } from "react";

import { getAuthToken } from "../utils/auth";

import "../styles/globals.css";

const client = new ApolloClient({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_API,
  cache: new InMemoryCache(),
  headers: {
    Authorization: `Bearer ${getAuthToken()}`,
  },
});

const GET_PROJECTS = gql`
  query {
    getProjects {
      id
      name
      color
      isActive
    }
  }
`;

const SWITCH_ACTIVE_PROJECT = gql`
  mutation SwitchActiveProject($projectId: String!) {
    switchActiveProject(projectId: $projectId) {
      id
      isActive
    }
  }
`;

function Navbar() {
  const router = useRouter();
  const isAuthenticated = getAuthToken();
  const { data, refetch } = useQuery(GET_PROJECTS);
  const [switchActiveProject] = useMutation(SWITCH_ACTIVE_PROJECT);
  const [activeProject, setActiveProject] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (data) {
      const active = data.getProjects.find((project) => project.isActive);
      setActiveProject(active);
    }
  }, [data]);

  const handleSwitch = async (projectId) => {
    try {
      await switchActiveProject({ variables: { projectId } });
      refetch();
    } catch (err) {
      console.error("Error switching project", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const NavLink = ({ href, children }) => {
    const router = useRouter();
    const isActive = router.pathname === href;

    return (
      <Link
        href={href}
        className={`px-3 py-3 ${
          isActive
            ? "bg-pink-500 text-white"
            : "text-gray-700 hover:bg-pink-200"
        }`}
        onClick={() => setMenuOpen(false)} // close menu on nav
      >
        {children}
      </Link>
    );
  };

  const NavLinkMobile = ({ href, children }) => {
    const router = useRouter();
    const isActive = router.pathname === href;

    return (
      <Link
        href={href}
        className={`mb-1 text-xl pl-4 pr-4 pt-2 pb-2 ${
          isActive
            ? "bg-pink-500 text-white"
            : "text-gray-700 hover:bg-pink-200"
        }`}
        onClick={() => setMenuOpen(false)} // close menu on nav
      >
        {children}
      </Link>
    );
  };

  const activeProjectColor = activeProject ? activeProject.color : "#cccccc";
  return (
    <>
      {/*{data && data.getProjects.length > 0 && (*/}
        <nav
          className="bg-white shadow-md flex items-center justify-between border-b-8"
          style={{ borderColor: activeProjectColor }}
        >
          {/* Mobile burger button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden text-6xl pl-2 pb-2"
          >
            ☰
          </button>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center">
            {/* <NavLink href="/">Home</NavLink>*/}
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/dailies-overview">Dailies all</NavLink>
            <NavLink href="/project">Projects</NavLink>
            <NavLink href="/kanban">Kanban</NavLink>
            <NavLink href="/kanban-overview">KB all</NavLink>
            <NavLink href="/favorites">Favorites</NavLink>
            <NavLink href="/notes">Notes</NavLink>
            <NavLink href="/income">Income</NavLink>
            <NavLink href="/income-statistics">Income stats</NavLink>
            <button
              onClick={handleLogout}
              className="text-red-500 font-medium cursor-pointer hover:bg-pink-200 p-3"
            >
              Logout
            </button>
          </div>

          {/* Mobile menu */}
          {menuOpen && (
            <div className="absolute top-13 left-0 w-full h-full bg-white shadow-md sm:hidden z-50">
              <div className="flex flex-col pl-0 pt-3 pr-0 pb-4 space-y-2">
                <NavLinkMobile href="/dashboard">Dashboard</NavLinkMobile>
                <NavLinkMobile href="/dailies-overview">
                  Dailies all
                </NavLinkMobile>
                <NavLinkMobile href="/project">Projects</NavLinkMobile>
                <NavLinkMobile href="/kanban">Kanban</NavLinkMobile>
                <NavLinkMobile href="/kanban-overview">KB all</NavLinkMobile>
                <NavLinkMobile href="/favorites">Favorites</NavLinkMobile>
                <NavLinkMobile href="/notes">Notes</NavLinkMobile>
                <NavLinkMobile href="/income">Income</NavLinkMobile>
                <NavLinkMobile href="/income-statistics">
                  Income stats
                </NavLinkMobile>
                <button
                  onClick={handleLogout}
                  className="text-red-500 font-medium text-xl cursor-pointer ml-1 p-3 w-fit mt-4"
                >
                  Logout
                </button>
              </div>
            </div>
          )}

          <div>
            {data && data.getProject.length > 0 && (
              <select
                className="text-pink-400 font-bold cursor-pointer bg-pink-100 p-3 hover:bg-fuchsia-200 md:h-auto h-17 md:w-auto"
                onChange={(e) => handleSwitch(e.target.value)}
                value={activeProject ? activeProject.id : ""}
              >
                {data.getProject.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} {project.isActive ? "" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        </nav>
      {/*})}*/}
    </>
  );
}

export default function App({ Component, pageProps }) {
  return (
    <ApolloProvider client={client}>
      <Toaster />
      <Navbar />
      <Component {...pageProps} />
    </ApolloProvider>
  );
}
