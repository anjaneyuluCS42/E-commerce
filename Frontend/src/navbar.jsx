import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav
      style={{
        background: "#2563eb",
        color: "white",
        padding: "15px",
        display: "flex",
        justifyContent: "space-between"
      }}
    >
      <h2>E-Commerce Store</h2>

      <div>
        <Link
          to="/"
          style={{ color: "white", marginRight: "15px" }}
        >
          Products
        </Link>

        <Link
          to="/login"
          style={{ color: "white", marginRight: "15px" }}
        >
          Login
        </Link>

        <Link
          to="/register"
          style={{ color: "white" }}
        >
          Register
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;