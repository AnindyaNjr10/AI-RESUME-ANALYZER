import {Link} from "react-router";
import {usePuterStore} from "~/lib/puter";

const Navbar = () => {
    const { auth, isLoading } = usePuterStore();

    const userDisplayName = auth.user?.name || auth.user?.displayName || auth.user?.username;

    return (
        <nav className="navbar">
            <Link to="/">
                <p className="text-2xl font-bold text-gradient">NexHire</p>
            </Link>
            <div className="flex items-center gap-3">
                <Link to="/upload" className="primary-button w-fit">
                    Upload Resume
                </Link>
                {auth.isAuthenticated ? (
                    <div className="flex items-center gap-3 rounded-full border border-gray-200 bg-gray-50 px-4 py-2">
                        <span className="text-sm font-medium text-slate-700">
                            Hello, {userDisplayName}
                        </span>
                        <button
                            type="button"
                            onClick={auth.signOut}
                            className="rounded-full bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
                            disabled={isLoading}
                        >
                            {isLoading ? "Signing out..." : "Logout"}
                        </button>
                    </div>
                ) : (
                    <Link
                        to="/auth?next=/upload"
                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                        {isLoading ? "Please wait..." : "Login"}
                    </Link>
                )}
            </div>
        </nav>
    )
}
export default Navbar
