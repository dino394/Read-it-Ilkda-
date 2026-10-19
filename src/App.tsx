import { useState } from "react";

import Login from "./pages/Login";
import Home from "./pages/Home";

function App() {
  const [isLoggedIn, setIsLoggedIn] =
    useState(
      Boolean(
        localStorage.getItem(
          "read-it-token"
        )
      )
    );

  if (!isLoggedIn) {
    return (
      <Login
        onLoginSuccess={() =>
          setIsLoggedIn(true)
        }
      />
    );
  }

  return <Home />;
}

export default App;