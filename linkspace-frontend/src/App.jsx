import { HashRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import Train from "./pages/Train.jsx";
import Studio from "./pages/Studio.jsx";
import Progress from "./pages/Progress.jsx";
import Club from "./pages/Club.jsx";
import Account from "./pages/Account.jsx";
import "./App.css";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/train" element={<Train />} />
          <Route path="/train/:slug" element={<Train />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/club" element={<Club />} />
          <Route path="/account" element={<Account />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
